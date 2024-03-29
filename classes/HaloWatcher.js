/*
 * Copyright (C) 2024 Elijah Olmos
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

/*
 * Copyright (C) 2023 Elijah Olmos
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import { EventEmitter } from 'node:events';
import { setIntervalAsync } from 'set-interval-async/fixed';
import { Firebase, Halo, handle401, HealthManager, Logger } from '.';
import { CLASS_ANNOUNCEMENTS, USER_GRADES, USER_INBOX } from '../caches';

export class HaloWatcher extends EventEmitter {
	constructor() {
		super();

		//create intervals
		setIntervalAsync(async () => {
			await this.#watchForAnnouncements();
			HealthManager.record('ANNOUNCEMENTS');
		}, 20000);
		setIntervalAsync(async () => {
			await this.#watchForGrades();
			HealthManager.record('GRADES');
		}, 20000);
		setIntervalAsync(async () => {
			await this.#watchForInboxMessages();
			HealthManager.record('INBOX_MESSAGES');
		}, 20000);
	}

	/**
	 * returns an array of objects that are present in a1 but not a2
	 *
	 * adapted from https://stackoverflow.com/a/40538072
	 * @param {Array} a1
	 * @param {Array} a2
	 */
	#locateDifferenceInArrays(a1, a2) {
		const id_array = a1
			.map((o) => o.id)
			.filter(function (n) {
				return !this.has(n);
			}, new Set(a2.map((o) => o.id)));
		//^ an array of ids that we need to use to find the actual objects
		const diff_array = []; //empty array to return later
		for (const id of id_array) {
			const found_obj = a1.find((o) => o.id == id);
			!!found_obj && diff_array.push(found_obj); //if we actually have an obj, push it
		}
		return diff_array;
	}

	async #watchForAnnouncements() {
		const { get, set, writeCacheFile } = CLASS_ANNOUNCEMENTS;
		const getAnnouncements = async function getClassAnnouncementsSafe({ class_id, active_users, metadata }) {
			for (const uid of active_users)
				try {
					const cookie = await Firebase.getUserCookie(uid);
					if (!cookie) continue;
					const announcements = await Halo.getClassAnnouncements({
						class_id,
						//use the cookie of a user from the course
						cookie,
						//inject the readable course code into the response objects
						metadata,
					});
					if (!!announcements) return announcements;
				} catch (e) {
					if (e.code === 401)
						handle401({
							uid,
							msg: `[getClassAnnouncementsSafe] Received 401 while fetching announcements for course ${metadata?.courseCode} using ${uid} cookie`,
						});
					else
						Logger.error(
							`[getClassAnnouncementsSafe] Non-401 error while fetching announcements for ${
								metadata?.courseCode
							} with ${uid} cookie: ${e} ${JSON.stringify(e)}`
						);
				}
			return null;
		};

		//retrieve all courses that need information fetched
		const COURSES = await Firebase.getActiveClasses();
		//fetch new announcements
		for (const [class_id, course] of Object.entries(COURSES)) {
			try {
				const active_users = Firebase.getActiveUsersInClass(class_id);
				if (!active_users?.length) continue;
				//Logger.debug(`Getting announcements for ${course.courseCode}...`);
				const old_announcements = get(class_id) || null;
				const new_announcements =
					(await getAnnouncements({
						class_id,
						active_users,
						//inject the readable course code into the response objects
						//this metadata is being stored in the cache unnecessarily
						metadata: {
							courseCode: course.courseCode,
							slugId: course.slugId,
						},
					})) ?? old_announcements;
				// Logger.debug(old_announcements?.length);
				// Logger.debug(new_announcements.length);
				set(class_id, new_announcements);

				//if no old announcements, user just installed
				if (old_announcements === null) {
					await writeCacheFile({ filepath: class_id, data: new_announcements });
					continue;
				}

				// === rather than > because teachers can remove announcements
				if (new_announcements.length === old_announcements.length) continue;

				//at this point, new announcements were detected
				Logger.debug(
					`${course.courseCode}: new_announcements: ${new_announcements.length}, old_announcements: ${old_announcements.length}`
				);
				//write local cache to file, since changes were detected
				await writeCacheFile({ filepath: class_id, data: new_announcements });

				/**
				 * Determine if an announcement was published "recently" (determined by inner-function criteria)
				 * @returns {boolean} Whether or not the announcement was published recently
				 */
				const isRecentAnnouncement = function (announcement) {
					const publishTime = new Date(announcement.publishDate).getTime();
					const startTime = new Date(announcement.startDate).getTime();
					const threshold = new Date().getTime() - 1000 * 60 * 60 * 48; // 48 hours

					return publishTime > threshold || startTime > threshold;
				};

				// to prevent announcement spam upon bot restart, only emit announcements that were published in past 6 hours
				for (const announcement of this.#locateDifferenceInArrays(new_announcements, old_announcements))
					isRecentAnnouncement(announcement) && this.emit('announcement', announcement);
			} catch (e) {
				if (e.code === 401)
					Logger.unauth(`Received 401 while fetching announcements for course ${course.courseCode}`);
				else
					Logger.error(
						`Error while fetching announcements for ${course.courseCode}: ${e} ${JSON.stringify(e)}`
					);
			}
		}
	}

	async #watchForGrades() {
		const { get, set, writeCacheFile } = USER_GRADES;

		//retrieve all courses that need information fetched
		const COURSES = await Firebase.getActiveClasses();

		//fetch new grades
		for (const [course_id, course] of Object.entries(COURSES)) {
			for (const uid of Firebase.getActiveUsersInClass(course_id)) {
				try {
					// Logger.debug(`Getting ${uid} grades for ${course.courseCode}...`);
					const cookie = await Firebase.getUserCookie(uid); //store user cookie for multiple uses
					if (!cookie) continue;
					const old_grades = get([course_id, uid], null);
					//Logger.debug(old_grades);
					const { grades, finalGrade } = await Halo.getAllGrades({
						class_slug_id: course.slugId,
						//use the cookie of a user from the course
						cookie,
						//inject the readable course code into the response objects
						metadata: {
							courseCode: course.courseCode,
						},
					});
					const new_grades = grades.filter((grade) => grade.status === 'PUBLISHED');
					// Logger.debug(old_grades?.length);
					// Logger.debug(new_grades.length);
					set([course_id, uid], new_grades); //update local cache

					//if no old grades, user just installed
					if (old_grades === null) {
						writeCacheFile({ filepath: `${course_id}/${uid}.json`, data: new_grades });
						continue;
					}

					// === rather than > because teachers can remove grades
					if (new_grades.length === old_grades.length) continue;

					//at this point, new grades were detected
					// Logger.debug(`new_grades: ${new_grades.length}, old_grades: ${old_grades.length}`);
					//write local cache to file, since changes were detected
					await writeCacheFile({ filepath: `${course_id}/${uid}.json`, data: new_grades });

					for (const grade of this.#locateDifferenceInArrays(new_grades, old_grades)) {
						//if the user has already viewed the grade, don't send a notification
						if (!!grade.userLastSeenDate) continue;
						// if (!Firebase.getUserSettingValue({ uid, setting_id: 1 })) continue; //check setting inside diff loop to ensure cache was updated

						//fetch the full grade feedback
						this.emit(
							'grade',
							await Halo.getGradeFeedback({
								cookie,
								assessment_id: grade.assessment.id,
								//TODO: shift to Firebase.getHaloUid() from a Firebase UID
								uid: await Halo.getUserId({ cookie }), //uid in scope of loop is Firebase uid
								metadata: {
									courseCode: course.courseCode,
									finalGrade,
									uid,
									slugId: course.slugId,
								},
							})
						);
					}
				} catch (e) {
					if (e.code === 401)
						handle401({
							uid,
							msg: `Received 401 while fetching ${uid} grades for course ${course.courseCode}`,
						});
					else
						Logger.error(
							`Error while fetching ${uid} grades for course ${course.courseCode}: ${e} ${JSON.stringify(
								e
							)}`
						);
				}
			}
		}
	}

	async #watchForInboxMessages() {
		const { get, set, writeCacheFile } = USER_INBOX;

		const getUnreadMessagesCount = function getUnreadInboxMessagesCountFromCache({ uid, forumId }) {
			return get([uid, forumId], []).filter(({ isRead }) => !isRead).length;
		};

		//retrieve all active users
		const ACTIVE_USERS = await Firebase.getAllActiveUsers();

		//retrieve all inbox forums that need information fetched
		for (const uid of ACTIVE_USERS) {
			try {
				const cookie = await Firebase.getUserCookie(uid); //store user cookie as var for multiple references
				if (!cookie) continue;
				for (const { forumId, unreadCount } of await Halo.getUserInbox({ cookie })) {
					//Logger.debug(`Getting ${uid} inbox posts for forum ${forumId}...`);

					//goal is to minimize halo API calls placed
					const old_inbox_posts = get([uid, forumId], null);
					//if no old inbox posts, user just installed
					//if no unread posts or unread count is same as unread cache count (user has been notified but they have not acknowledged)
					if (
						old_inbox_posts !== null &&
						(!unreadCount || unreadCount === getUnreadMessagesCount({ uid, forumId }))
					)
						continue;

					const new_inbox_posts = await Halo.getPostsForInboxForum({ cookie, forumId });
					// Logger.debug(old_inbox_posts?.length);
					// Logger.debug(new_inbox_posts.length);
					set([uid, forumId], new_inbox_posts); //update local cache

					//if no old posts, user just installed
					if (old_inbox_posts === null) {
						writeCacheFile({ filepath: `${uid}/${forumId}.json`, data: new_inbox_posts });
						continue;
					}

					// === rather than > because teachers can delete messages ??? unconfirmed
					if (new_inbox_posts.length === old_inbox_posts.length) continue;

					//at this point, new inbox posts were detected
					Logger.debug(
						`new_inbox_posts: ${new_inbox_posts.length}, old_inbox_posts: ${old_inbox_posts.length}`
					);
					//write local cache to file, since changes were detected
					await writeCacheFile({ filepath: `${uid}/${forumId}.json`, data: new_inbox_posts });

					for (const post of this.#locateDifferenceInArrays(new_inbox_posts, old_inbox_posts)) {
						//if !post.iRead && post.id is not in cache, then dispatch event
						if (!!post.isRead) continue;
						// if (!Firebase.getUserSettingValue({ uid, setting_id: 2 })) continue; //check setting inside diff loop to ensure cache was updated
						this.emit('inbox_message', { ...post, metadata: { uid } });
					}
				}
			} catch (e) {
				if (e.code === 401)
					handle401({
						uid,
						msg: `Received 401 while fetching ${uid} inbox notifications`,
					});
				else Logger.error(`Error while fetching ${uid} inbox notifications: ${JSON.stringify(e)}`);
			}
		}
	}
}

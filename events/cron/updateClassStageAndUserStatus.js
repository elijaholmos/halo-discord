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

import bot from '../../bot';
import { CRON_CLASS_STAGES, CRON_USER_CLASS_STATUSES } from '../../caches';
import { CronEvent, EmbedBase, Firebase, Halo, Logger } from '../../classes';
import { db } from '../../firebase';
import { USER_CLASSES_MAP } from '../../stores';

// although this is two operations in one, it's more efficient to iterate over the users and their classes in a single run than to break it up
export default class extends CronEvent {
	constructor() {
		super({
			name: 'updateClassStageAndUserStatus',
			schedule: '45 22 * * *', //every day at 22:45
		});
	}

	async #constructCaches() {
		if (CRON_CLASS_STAGES.size === 0) {
			const classes = await Firebase.getAllClasses();
			for (const class_id in classes)
				CRON_CLASS_STAGES.set(class_id, classes[class_id]) &&
					(await CRON_CLASS_STAGES.writeCacheFile({ filepath: class_id, data: classes[class_id] }));
			Logger.cron(
				`[${this.name}] was empty; fetched ${Object.keys(classes).length} CRON_CLASS_STAGES, cached ${
					CRON_CLASS_STAGES.size
				} CRON_CLASS_STAGES`
			);
		}

		if (CRON_USER_CLASS_STATUSES.size === 0) {
			for (const [uid, classes] of USER_CLASSES_MAP.entires())
				CRON_USER_CLASS_STATUSES.set(uid, classes) &&
					(await CRON_USER_CLASS_STATUSES.writeCacheFile({ filepath: uid, data: classes }));
			Logger.cron(`[${this.name}] was empty; cached ${CRON_USER_CLASS_STATUSES.size} CRON_CLASS_USER_STATUSES`);
		}

		return;
	}

	async run() {
		Logger.cron(`[${this.name}] cron job execution started`);
		const changelog = []; //for post-job reporting

		//we can cache the previous job's results in local file to improve performance & save db costs
		await this.#constructCaches();

		//get all active users
		//for each active user, pull userOverview
		const users = await Firebase.getAllActiveUsersFull();
		for (const uid in users) {
			try {
				const { halo_id } = users[uid];

				//user is not in cache, use FirestoreStore to get their classes from db
				if (!CRON_USER_CLASS_STATUSES.get(uid)) {
					Logger.cron(`[${this.name}] ${uid} was not in CRON_USER_CLASS_STATUSES, fetching from db`);
					changelog.push({ type: 'new_user', uid });
					const data = USER_CLASSES_MAP.get(uid);
					CRON_USER_CLASS_STATUSES.set(uid, data);
					await CRON_USER_CLASS_STATUSES.writeCacheFile({ filepath: uid, data });
				}

				const cookie = await Firebase.getUserCookie(uid);
				if (!cookie) throw `Firebase.getUserCookie(${uid}) returned null`;

				const { classes } = await Halo.getUserOverview({
					cookie,
					uid: halo_id,
				});

				// detect user being removed from class
				for (const class_id in CRON_USER_CLASS_STATUSES.get(uid)) {
					if (!!classes.courseClasses.find(({ id }) => id === class_id)) continue;
					// user was removed from class
					Logger.cron(`[${this.name}] ${uid} removed class detected: ${class_id}`);
					changelog.push({
						type: 'user_remove_class',
						uid,
						class_id,
					});
					//update db
					await db.ref('user_classes_map').child(uid).child(class_id).remove();
					await db.ref('class_users_map').child(class_id).child(uid).remove();
					//update local caches
					const data = CRON_USER_CLASS_STATUSES.get(uid);
					delete data[class_id];
					CRON_USER_CLASS_STATUSES.set(uid, data);
					await CRON_USER_CLASS_STATUSES.writeCacheFile({ filepath: uid, data });
				}

				for (const {
					id: class_id,
					name,
					slugId,
					classCode,
					courseCode,
					stage,
					students,
				} of classes.courseClasses) {
					//TODO: implement try-catch?
					const init_changelog_length = changelog.length; //to check if changes were made this iteration

					// new class was added (to halo)
					if (!CRON_CLASS_STAGES.get(class_id)) {
						Logger.cron(`[${this.name}] ${class_id} was not in CRON_CLASS_STAGES, fetching from db`);
						changelog.push({
							type: 'new_class',
							class_id,
							classCode,
						});
						const data = { name, slugId, classCode, courseCode, stage };
						//update db
						await db.ref('classes').child(class_id).update(data);
						//update local cache
						CRON_CLASS_STAGES.set(class_id, data);
						await CRON_CLASS_STAGES.writeCacheFile({ filepath: class_id, data });
					} //if this is true, next statement is guaranteed to (redundantly) trigger

					// realistically, stage is the only thing that will change at a course level
					else if (CRON_CLASS_STAGES.get(class_id)?.stage !== stage) {
						Logger.cron(
							`[${this.name}] ${class_id} stage changed from ${
								CRON_CLASS_STAGES.get(class_id)?.stage
							} to ${stage}`
						);
						changelog.push({
							type: 'class_stage',
							class_id,
							classCode,
							old: CRON_CLASS_STAGES.get(class_id)?.stage,
							new: stage,
						});
						//update db
						await db.ref('classes').child(class_id).update({ stage });
						//update local cache
						CRON_CLASS_STAGES.update(class_id, { stage });
						await CRON_CLASS_STAGES.writeCacheFile({
							filepath: class_id,
							data: CRON_CLASS_STAGES.get(class_id),
						});
					}

					const old_user_classes = CRON_USER_CLASS_STATUSES.get(uid);
					const new_user_status = students.find(({ userId }) => userId === halo_id)?.status ?? 'UNKNOWN';

					// user enrolled in a new class
					if (!old_user_classes.hasOwnProperty(class_id)) {
						Logger.cron(`[${this.name}] ${uid} new class detected: ${class_id}`);
						changelog.push({
							type: 'user_new_class',
							uid,
							class_id,
							classCode,
						});
						//update db
						await db.ref('user_classes_map').child(uid).child(class_id).update({ status: new_user_status });
						//update local caches
						const data = { ...old_user_classes, [class_id]: { status: new_user_status } };
						CRON_USER_CLASS_STATUSES.set(uid, data);
						await CRON_USER_CLASS_STATUSES.writeCacheFile({ filepath: uid, data });
					} //if this is true, next statement is guaranteed to (redundantly) trigger

					//user's status for this specific class has changed
					else if (old_user_classes[class_id]?.status !== new_user_status) {
						Logger.cron(
							`[${this.name}] ${uid} status for ${class_id} changed from ${old_user_classes[class_id]?.status} to ${new_user_status}`
						);
						changelog.push({
							type: 'user_class_status',
							uid,
							class_id,
							classCode,
							old: old_user_classes[class_id]?.status, //this will be absent if user just entrolled in class
							new: new_user_status,
						});
						await db.ref('user_classes_map').child(uid).child(class_id).update({ status: new_user_status });

						const data = { ...old_user_classes, [class_id]: { status: new_user_status } };
						CRON_USER_CLASS_STATUSES.update(uid, data);
						await CRON_USER_CLASS_STATUSES.writeCacheFile({ filepath: uid, data });
					}

					//I think the individual writeCacheFile's above may be redundant
					if (init_changelog_length !== changelog.length) {
						Logger.cron(`[${this.name}] ${uid} changes detected in class ${class_id}, writingCacheFiles`);
						await CRON_CLASS_STAGES.writeCacheFile({
							filepath: class_id,
							data: CRON_CLASS_STAGES.get(class_id),
						});
						await CRON_USER_CLASS_STATUSES.writeCacheFile({
							filepath: uid,
							data: CRON_USER_CLASS_STATUSES.get(uid),
						});
					}

					// user should(?) be actively enrolled in class if it appears in their overview
					// if new_status is null, it means halo completely removed user from class
					await db.ref('class_users_map').child(class_id).child(uid).set(true);
				}
			} catch (e) {
				if (e.code === 401)
					Logger.cron(`[${this.name}] Received 401 while attempt to work with ${uid}'s cookie`);
				else Logger.cron(`Error while working with ${uid}'s cookie: ${JSON.stringify(e)}`);
			}
		}

		bot.logCron({
			embed: new EmbedBase({
				color: 0xcedb39,
				title: `${this.name}`,
				description: 'summary of changes',
				fields: changelog.map(({ type, ...rest }) => ({
					name: `${type.toUpperCase()}`,
					value: Object.entries(rest).reduce((acc, [key, val]) => acc.concat(`\n${key}: 	\`${val}\``), ''),
				})),
			}),
		});

		Logger.cron(`[${this.name}] cron job execution finished; changelog: ${changelog.length}`);
	}
}

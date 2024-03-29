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

import { gql, request } from 'graphql-request';
import sa_request from 'superagent';
import { EmbedBase, Firebase, validateCookie } from '..';

const url = {
	token:
		process.env.NODE_ENV === 'production'
			? 'https://halo.gcu.edu/api/refresh-token'
			: 'http://localhost:3000/refresh-token',
	validate:
		process.env.NODE_ENV === 'production'
			? 'https://halo.gcu.edu/api/token-validate/'
			: 'http://localhost:3000/token-validate/',
};
export const AUTHORIZATION_KEY = 'TE1TX0FVVEg';
export const CONTEXT_KEY = 'TE1TX0NPTlRFWFQ';

/**
 * GraphQL request wrapper
 */
const req = async (opts = {}) => {
	try {
		return await request({
			url:
				process.env.NODE_ENV === 'production'
					? 'https://gateway.halo.gcu.edu'
					: 'http://localhost:3000/gateway', //default gql url
			...opts,
		});
	} catch (e) {
		return e?.response?.errors?.[0];
	}
};
/**
 * Generate headers that are common to all requests
 */
const headers = (cookie) => ({
	accept: '*/*',
	'content-type': 'application/json',
	authorization: `Bearer ${cookie[AUTHORIZATION_KEY]}`,
	contexttoken: `Bearer ${cookie[CONTEXT_KEY]}`,
	'Apollo-Require-Preflight': 'true',
});
/**
 * Check if a response contains an authentication error
 */
const isAuthError = (res) =>
	res?.message?.includes('401') ||
	res?.message?.includes('response was malformed') ||
	res?.extensions?.errorCode == 401;

export const refreshToken = async function ({ cookie }) {
	const res = await sa_request.post(url.token).set({
		//'content-length': 474,
		...headers(cookie),
		cookie: new URLSearchParams(Object.entries(cookie)).toString().replaceAll('&', '; '),
	});
	if (!res.body?.[AUTHORIZATION_KEY] || !res.body?.[CONTEXT_KEY])
		throw `Error fetching token: ${JSON.stringify(res.body)}`;

	return {
		[AUTHORIZATION_KEY]: res.body[AUTHORIZATION_KEY],
		[CONTEXT_KEY]: res.body[CONTEXT_KEY],
	};
};

/**
 * Get all published announcements for a class
 * @param {Object} args Desctructured arguments
 * @param {Object} args.cookie The cookie object retrieved from Firebase
 * @param {string} args.class_id unique class ID
 * @param {Object} [args.metadata] Optional metadata to be injected into the announcement object
 * @returns {Promise<Array>} Array of announcements published within the past 10 seconds
 */
export const getClassAnnouncements = async function ({ cookie, class_id, metadata = {} } = {}) {
	const res = await req({
		requestHeaders: headers(cookie),
		document: gql`
			query GetAnnouncementsStudent($courseClassId: String!) {
				announcements(courseClassId: $courseClassId) {
					posts {
						id
						content
						publishDate
						startDate
						title
						postStatus
						createdBy {
							user {
								firstName
								lastName
							}
						}
						resources {
							id
							kind
							name
						}
					}
				}
			}
		`,
		variables: {
			courseClassId: class_id,
		},
	});

	if (isAuthError(res)) throw { code: 401, cookie };
	//Error handling and data validation could be improved
	if (!!res?.message) throw res;
	//Filter posts that were published in last 10 seconds
	//Inject the class ID so we can use it to get the name later
	return (
		res.announcements.posts
			.filter((post) => post.postStatus === 'PUBLISHED')
			//.filter(post => new Date(post.publishDate).getTime() > new Date().getTime() - 10000)
			.map((post) => ({ ...post, courseClassId: class_id, metadata }))
	);
};

/**
 * @param {Object} args Desctructured arguments
 * @param {Object} args.cookie The cookie object retrieved from Firebase
 * @param {string} args.class_slug_id unique class slug ID of format COURSE_CODE-SECTION-ID
 * @param {Object} [args.metadata] Optional metadata to be injected into each element of the response array
 * @returns {Promise<{grades: Array; finalGrade: Object}>} Array of all grades for the user whose `cookie` was provided
 */
export const getAllGrades = async function ({ cookie, class_slug_id, metadata = {} } = {}) {
	const res = await req({
		requestHeaders: headers(cookie),
		document: gql`
			query GradeOverview($courseClassSlugId: String!, $courseClassUserIds: [String]) {
				gradeOverview: getAllClassGrades(
					courseClassSlugId: $courseClassSlugId
					courseClassUserIds: $courseClassUserIds
				) {
					finalGrade {
						finalPoints
						gradeValue
						maxPoints
					}
					grades {
						userLastSeenDate
						assessment {
							id
						}
						id
						status
					}
				}
			}
		`,
		variables: {
			courseClassSlugId: class_slug_id,
			courseClassUserIds: '', //auto-retrieved by token, I believe
		},
	});

	if (isAuthError(res)) throw { code: 401, cookie };
	if (!!res?.message) throw res;
	const { grades, finalGrade } = res.gradeOverview[0];
	return { grades: grades.map((grade) => ({ ...grade, metadata })), finalGrade };
};

/**
 * @param {Object} args Desctructured arguments
 * @param {Object} args.cookie The cookie object retrieved from Firebase
 * @param {string} args.assessment_id the unique assessment ID
 * @param {string} args.uid Halo UID of assessment submission author
 * @param {Object} [args.metadata] Optional metadata to be injected into the response object
 * @returns {Promise<Object>} Array of all grades for the user whose `cookie` was provided
 */
export const getGradeFeedback = async function ({ cookie, assessment_id, uid, metadata = {} } = {}) {
	const res = await req({
		requestHeaders: headers(cookie),
		document: gql`
			query AssessmentFeedback($assessmentId: String!, $userId: String!) {
				assessmentFeedback: getGradeForUserCourseClassAssessment(
					courseClassAssessmentId: $assessmentId
					userId: $userId
				) {
					assessment {
						id
						points
						title
					}
					id
					finalPoints
					finalComment {
						comment
					}
					user {
						id
					}
				}
			}
		`,
		variables: {
			assessmentId: assessment_id,
			userId: uid,
		},
	});

	if (isAuthError(res)) throw { code: 401, cookie };
	if (!!res?.message) throw res;
	return { ...res.assessmentFeedback, metadata };
};

/**
 * @param {Object} args Desctructured arguments
 * @param {Object} args.cookie The cookie object retrieved from Firebase
 * @returns {Promise<[{forumId: string, unreadCount: number}]>} Array of inbox forum objects for the user whose `cookie` was provided
 */
export const getUserInbox = async function getUserInboxForumIds({ cookie } = {}) {
	const res = await req({
		requestHeaders: headers(cookie),
		document: gql`
			query GetInboxLeftPanelNotification {
				getInboxLeftPanelNotification {
					inboxForumCount {
						forumId
						unreadCount
					}
				}
			}
		`,
	});

	if (isAuthError(res)) throw { code: 401, cookie };
	if (!!res?.message) throw res;
	return res.getInboxLeftPanelNotification.reduce((acc, { inboxForumCount }) => acc.concat(inboxForumCount), []);
};

/**
 * @param {Object} args Desctructured arguments
 * @param {Object} args.cookie The cookie object retrieved from Firebase
 * @param {string} args.forumId the unique inbox forum ID
 * @param {number} [args.pgNum] pagination - the number of pages to skip
 * @param {number} [args.pgSize] pagination - the number of posts to return
 * @param {Object} [args.metadata] Optional metadata to be injected into each element of the response array
 * @returns {Promise<Object[]>} Array of all inbox posts for the user whose `cookie` was provided
 */
export const getPostsForInboxForum = async function ({ cookie, forumId, pgNum = 1, pgSize = 10, metadata = {} } = {}) {
	const res = await req({
		requestHeaders: headers(cookie),
		document: gql`
			query getPostsByInboxForumId($forumId: String, $pgNum: Int, $pgSize: Int) {
				getPostsForInboxForum: getPostsForInboxForum(forumId: $forumId, pgNum: $pgNum, pgSize: $pgSize) {
					content
					createdBy {
						...courseClassUser
					}
					id
					isRead
					publishDate
					resources {
						...resource
					}
				}
			}
			fragment resource on Resource {
				id
				kind
				name
			}
			fragment courseClassUser on CourseClassUser {
				user {
					...user
				}
			}
			fragment user on User {
				firstName
				lastName
			}
		`,
		variables: { forumId, pgNum, pgSize },
	});

	if (isAuthError(res)) throw { code: 401, cookie };
	if (!!res?.message) throw res;
	return res.getPostsForInboxForum.map((post) => ({ ...post, metadata }));
};

export const getUserOverview = async function ({ cookie, uid }) {
	const res = await req({
		requestHeaders: headers(cookie),
		document: gql`
			query HeaderFields($userId: String!, $skipClasses: Boolean!) {
				userInfo: getUserById(id: $userId) {
					firstName
					lastName
				}
				classes: getCourseClassesForUser @skip(if: $skipClasses) {
					courseClasses {
						id
						classCode
						slugId
						name
						stage
						courseCode
						students {
							...headerUserFields
						}
					}
				}
			}
			fragment headerUserFields on CourseClassUser {
				userId
				status
			}
		`,
		variables: {
			userId: uid,
			skipClasses: false,
		},
	});

	if (isAuthError(res)) throw { code: 401, cookie };
	//Error handling and data validation could be improved
	if (!!res?.message) throw res;
	return res;
};

/**
 * Get the Halo user ID from a Halo cookie object
 * @param {Object} args Destructured arguments
 * @param {Object} args.cookie Cookie object of the user
 * @returns {Promise<string>} Halo UID, pulled from the cookie
 */
export const getUserId = async function ({ cookie }) {
	const res = await sa_request.post(url.validate).set(headers(cookie)).send({
		userToken: cookie[AUTHORIZATION_KEY],
		contextToken: cookie[CONTEXT_KEY],
	});

	if (
		res.body?.errors?.[0]?.message?.includes('401') ||
		res.body?.errors?.[0]?.message?.includes('response was malformed') ||
		isAuthError(res.body)
	)
		throw { code: 401, cookie };
	//Error handling and data validation could be improved
	if (!!res.error) throw res.error;
	return res.body.payload.userid;
};

/**
 * Check a Discord user's connection and return a response embed
 * @param {Object} args Destructured arguments
 * @param {string} args.uid Discord UID of the user
 * @returns {Promise<EmbedBase>}
 */
export const generateUserConnectionEmbed = async function ({ uid }) {
	try {
		const cookie = await Firebase.getUserCookie(uid);

		if (!(await validateCookie({ cookie }))) throw `Cookie for ${uid} failed to pass validation`;
		return new EmbedBase({
			description: '✅ **Your account is currently connected to Halo**',
		}).Success();
	} catch (err) {
		return new EmbedBase().ErrorDesc('Your account is currently not connected to Halo');
	}
};

/**
 * @param {Object} args Desctructured arguments
 * @param {Object} args.cookie The cookie object retrieved from Firebase
 * @param {string} args.assessment_grade_id the ID of the `UserCourseClassAssessmentGrade` - only appears on submissions that have been graded
 *
 * This should be the `id` property on each object retrieved from `getAllGrades()`, NOT the `id` of the `CourseClassAssessment`
 * @returns {Promise<Object>} Acknowledgement response from the server
 */
export const acknowledgeGrade = async function ({ cookie, assessment_grade_id }) {
	const res = await req({
		requestHeaders: headers(cookie),
		document: gql`
			mutation AddStudentGradeSeenDateTime($userCourseClassAssessmentGradeId: String!) {
				addStudentGradeSeenDateTime(userCourseClassAssessmentGradeId: $userCourseClassAssessmentGradeId) {
					userLastSeenDate
				}
			}
		`,
		variables: { userCourseClassAssessmentGradeId: assessment_grade_id },
	});

	if (isAuthError(res)) throw { code: 401, cookie };
	if (!!res?.message) throw res;
	return res.addStudentGradeSeenDateTime;
};

/**
 * Acknowledge Halo posts (and annoucnements) on behalf of a student
 * @param {Object} args Desctructured arguments
 * @param {Object} args.cookie The cookie object retrieved from Firebase
 * @param {string} args.post_id the ID of the `Post` to acknowledge
 * @returns {Promise<Object>} Acknowledgement response from the server
 */
export const acknowledgePost = async function ({ cookie, post_id }) {
	const res = await req({
		requestHeaders: headers(cookie),
		document: gql`
			mutation markPostsAsRead($postIds: [String]) {
				markPostsAsRead(postIds: $postIds)
			}
		`,
		variables: { postIds: [post_id] },
	});

	if (isAuthError(res)) throw { code: 401, cookie };
	if (!!res?.message) throw res;
	return res.markPostsAsRead;
};

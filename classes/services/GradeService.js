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

import { decode } from 'html-entities';
import { round } from 'lodash-es';
import { EmbedBase, Firebase, Logger } from '..';
import bot from '../../bot';

export class GradeService {
	/**
	 * @param {Object} grade A full Halo UserCourseClassAssessmentGrade object
	 */
	static processGrade = (grade) => {
		this.#publishGrade({ grade });
	};

	/**
	 * @param {Object} args Desctructured arguments
	 * @param {Object} args.grade A full Halo UserCourseClassAssessmentGrade object
	 * @returns {Promise<void>}
	 */
	static async #publishGrade({ grade }) {
		try {
			const discord_uid = grade?.metadata?.uid ?? (await Firebase.getDiscordUidFromHaloUid(grade.user.id));
			const show_overall_grade = Firebase.getUserSettingValue({
				uid: discord_uid,
				setting_id: 4,
			});

			const discord_user = await bot.users.fetch(discord_uid);
			discord_user
				.send(this.#parseGradeData({ grade, show_overall_grade }))
				.catch((e) =>
					Logger.error(`Error sending grade notification to ${discord_user.tag} (${discord_uid}): ${e}`)
				);
			Logger.log(`Grade DM sent to ${discord_user.tag} (${discord_uid})`);
			bot.logDiscord({
				embed: new EmbedBase({
					title: 'Grade Message Sent',
					fields: [
						{
							name: 'Receipient',
							value: bot.formatUser(discord_user),
							inline: true,
						},
						{
							name: 'Grade ID',
							value: grade.id,
							inline: false,
						},
					],
				}),
			});
		} catch (e) {
			Logger.warn(`Error pubishing grade ${grade?.id} for user ${grade?.user?.id}: ${e}`);
		}
	}

	/**
	 * @param {Object} args Desctructured arguments
	 * @param {Object} args.grade A full Halo UserCourseClassAssessmentGrade object
	 * @param {boolean} [args.show_overall_grade=true] Whether or not to include the overall class grade in the message embed
	 * @returns {Object} A message object to be sent straight to Discord
	 */
	static #parseGradeData({ grade, show_overall_grade = true }) {
		const parsePercent = function (dividend, divisor) {
			return divisor < 1 ? 'N/A' : `${round((dividend / divisor) * 100, 2)}%`;
		};

		const {
			finalPoints,
			finalComment,
			id: gradeId,
			assessment: { points, title, id: assessmentId },
			metadata: {
				courseCode,
				finalGrade: { finalPoints: totalFinalPoints, maxPoints, gradeValue },
				slugId,
			},
		} = grade;
		const feedbackUrl = `https://halo.gcu.edu/courses/${slugId}/student/gradebook#grading-feedback/${assessmentId}`;

		return {
			content: `New grade published for **${courseCode}**:`,
			embeds: [
				new EmbedBase({
					title,
					//description: `Worth ${Math.round(grade.assessment.points / )}% of your total grade`,
					fields: [
						{
							name: 'Assignment Score:',
							value: `**${finalPoints} / ${points}** (${parsePercent(finalPoints, points)})`,
						},
						{
							name: `Feedback:`,
							value: !!finalComment?.comment
								? decode(
										finalComment.comment
											.replaceAll('<br>', '\n')
											.replaceAll('</p><p>', '\n') //this is kinda hacky ngl
											.replaceAll('<li>', '\n\t\u2022 ')
											.replaceAll('</ol>', '\n')
											.replaceAll('</ul>', '\n')
											.replace(/<\/?[^>]+(>|$)/g, '')
								  )
								: 'None',
						},
						...(show_overall_grade
							? [
									{
										name: 'Overall Class Grade:',
										value: `**${totalFinalPoints} / ${maxPoints}** (${parsePercent(
											totalFinalPoints,
											maxPoints
										)} \u200b ${gradeValue}) `,
									},
							  ]
							: []),
					],
					timestamp: Date.now(),
				}),
			],
			components: [
				{
					components: [
						{
							type: 2,
							style: 1,
							custom_id: `$grade_${gradeId}`,
							disabled: false,
							label: 'Mark as Read',
							emoji: {
								name: '✉',
							},
						},
						...(feedbackUrl?.startsWith('https://')
							? [
									{
										type: 2,
										style: 5,
										label: 'View Feedback',
										url: feedbackUrl,
									},
							  ]
							: []),
					],
					type: 1,
				},
			],
		};
	}
}

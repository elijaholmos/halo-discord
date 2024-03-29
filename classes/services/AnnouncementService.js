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
import { EmbedBase, Firebase, Logger } from '..';
import bot from '../../bot';

export class AnnouncementService {
	/**
	 * @param {Object} announcement A raw Halo announcement object
	 */
	static processAnnouncement = (announcement) => {
		this.#publishAnnouncement({
			announcement,
			message: this.#parseAnnouncementData({ announcement }),
		});
	};

	/**
	 * @param {Object} args Desctructured arguments
	 * @param {Object} args.announcement A raw Halo announcement object
	 * @param {Object} args.message A parsed message object to be sent straight to Discord
	 * @returns {Promise<void>}
	 */
	static async #publishAnnouncement({ announcement, message }) {
		//get all active users in the class and send the message to them
		for (const uid of Firebase.getActiveUsersInClass(announcement.courseClassId)) {
			try {
				// if (!Firebase.getUserSettingValue({ uid, setting_id: 0 })) continue;
				const discord_user = await bot.users.fetch(uid);
				discord_user
					.send(message)
					.catch((e) => Logger.error(`Error sending announcement to ${discord_user.tag} (${uid}): ${e}`));
				Logger.log(`Announcement DM sent to ${discord_user.tag} (${uid})`);
				bot.logDiscord({
					embed: new EmbedBase({
						title: 'Announcement Message Sent',
						fields: [
							{
								name: 'Receipient',
								value: bot.formatUser(discord_user),
								inline: true,
							},
							{
								name: 'Announcement Title',
								value: announcement.title,
								inline: true,
							},
							{
								name: 'Announcement ID',
								value: announcement.id,
								inline: false,
							},
						],
					}),
				});
			} catch (e) {
				Logger.warn(`Error pubishing announcement ${announcement?.id} for user ${uid}: ${e}`);
			}
		}
	}

	/**
	 * @param {Object} args Desctructured arguments
	 * @param {Object} args.announcement A raw Halo announcement object
	 * @returns {Object} A message object to be sent straight to Discord
	 */
	static #parseAnnouncementData({ announcement }) {
		//Logger.debug(announcement);
		const {
			metadata: { slugId },
		} = announcement;

		return {
			content: `New announcement posted for **${announcement.metadata.courseCode}**:`,
			embeds: [
				new EmbedBase({
					title: announcement.title,
					description: `by ${announcement.createdBy.user.firstName} ${announcement.createdBy.user.lastName}`,
					fields: [
						{
							name: 'Message',
							value: decode(
								announcement.content
									.replaceAll('<br>', '\n')
									.replaceAll('</p><p>', '\n') //this is kinda hacky ngl
									.replaceAll('<li>', '\n\t\u2022 ')
									.replaceAll('</ol>', '\n')
									.replaceAll('</ul>', '\n')
									.replace(/<\/?[^>]+(>|$)/g, '')
							),
						},
						//TODO: cleanup dry code
						...(!!announcement.resources.filter(({ kind }) => kind !== 'URL').length
							? [
									{
										name: `Attachments (${
											announcement.resources.filter(({ kind }) => kind !== 'URL').length
										})`,
										value: announcement.resources
											.filter(({ kind }) => kind !== 'URL')
											.map((rs) => `[\`${rs.name}\`](https://halo.gcu.edu/resource/${rs.id})`)
											.join(', '),
									},
							  ]
							: []),
					],
					timestamp: announcement.publishDate,
				}),
			],
			components: [
				{
					components: [
						{
							type: 2,
							style: 1,
							custom_id: `$post_${announcement.id}`,
							disabled: false,
							label: 'Mark as Read',
							emoji: {
								name: '✉',
							},
						},
						{
							type: 2,
							style: 5,
							label: 'View Announcements',
							url: `https://halo.gcu.edu/courses/${slugId}/announcements`,
						},
					],
					type: 1,
				},
			],
		};
	}
}

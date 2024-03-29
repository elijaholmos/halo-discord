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

import { CookieManager, EmbedBase, Firebase, Halo, Logger } from '..';
import bot from '../../bot';
import { COOKIES, USER_401s } from '../../caches';

export const handle401 = async function ({ uid, msg }) {
	Logger.unauth(msg);

	//update cache file for tracking 401s
	const data = { timestamp: Date.now() };
	USER_401s.set(uid, data);
	await USER_401s.writeCacheFile({ filepath: uid, data });

	if (COOKIES.has(uid)) {
		Logger.debug(`[handle401] Cookie object for ${uid} detected in COOKIES cache; deleting...`);
		CookieManager.deleteUserCookie(uid);

		//check if setting enabled
		if (!Firebase.getUserSettingValue({ uid, setting_id: 3 })) return;
		// send notification to user
		const user = await bot.users.fetch(uid);
		const msg = await bot.sendDM({
			user,
			embed: new EmbedBase({
				title: 'Service Disconnected',
				description: `Halo Notification Service has temporarily lost connection to your Halo account. This occurs when Halo automatically logs you out; unfortunately, nothing can be done by HNS to fix this.
					To help prevent disconnections, periodically navigate to [halo.gcu.edu](https://halo.gcu.edu) using your web browser that has the HNS extension installed.`,
			}).Error(),
			components: [
				{
					components: [
						{
							type: 2,
							style: 1,
							custom_id: 'check-connection-btn',
							disabled: false,
							label: 'Check Connection',
						},
					],
					type: 1,
				},
			],
		});

		//log 401 in private channel
		bot.log401({
			embed: new EmbedBase({
				title: '401 Message Sent',
				fields: [
					{
						name: 'Receipient',
						value: bot.formatUser(user),
						inline: true,
					},
				],
			}).Error(),
		});

		msg.createMessageComponentCollector({
			filter: ({ customId }) => customId === 'check-connection-btn',
		}).on('collect', async (intr) => {
			const { user, customId } = intr;
			Logger.intr(`${user.tag} (${user.id}) clicked button ${customId}`);
			await intr.deferReply({ ephemeral: true });

			return bot.intrReply({
				intr,
				embed: await Halo.generateUserConnectionEmbed({ uid: user.id }),
				ephemeral: true,
			});
		});
	}

	//Firebase.removeUserCookie(uid);
};

export const remove401 = async function (uid) {
	if (!USER_401s.has(uid)) return;
	Logger.debug(`[remove401] Removing ${uid} from USER_401s cache...`);
	USER_401s.delete(uid);
	await USER_401s.deleteCacheFile({ filepath: uid });
};

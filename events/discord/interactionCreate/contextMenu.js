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

import bot from '../../../bot';
import { DiscordEvent, EmbedBase, Logger } from '../../../classes';

export default class extends DiscordEvent {
	constructor() {
		super({
			name: 'contextMenu',
			description: 'Receive, parse, and execute context menu commands',
			event_type: 'interactionCreate',
		});
	}

	async run(intr) {
		if (!intr.isContextMenu()) return;
		// Ignore commands sent by other bots or sent in DM
		if (intr.user.bot || !intr.inGuild()) return;

		const command = bot.commands.get(intr.commandName.replaceAll(' ', ''));

		//defer reply because some commands take > 3 secs to run
		command.deferResponse && (await intr.deferReply({ fetchReply: true }));

		try {
			Logger.cmd(`${intr.user.tag} (${intr.user.id}) ran context menu option ${intr.commandName}`);
			await command.run({ intr, user: intr.options.getMember('user'), msg: intr.options.getMessage('message') });
		} catch (err) {
			Logger.error(`Error with ctx menu cmd ${intr.commandName}: ${err}`);
			bot.intrReply({
				intr,
				embed: new EmbedBase({
					description: `❌ **I ran into an error while trying to run that command**`,
				}).Error(),
			});
		}
	}
}

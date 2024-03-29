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
import { DiscordEvent, EmbedBase, Firebase, Halo, Logger } from '../../../classes';

export default class extends DiscordEvent {
	constructor() {
		super({
			name: 'acknowledgeGrade',
			description: 'Mark a grade as read',
			event_type: 'interactionCreate',
		});
	}

	async run(intr) {
		if (!intr.isButton()) return;
		// Ignore interactions from other bots
		if (intr.user.bot) return;

		// ignore non-grade button clicks
		// id should be structured: $grade_{assessmentId}
		if (!intr.customId.startsWith('$grade_')) return;

		const assessment_grade_id = intr.customId.split('_')[1];

		try {
			Logger.cmd(`${intr.user.tag} (${intr.user.id})  clicked ${this.name} btn with id of ${intr.customId}`);
			await Halo.acknowledgeGrade({
				cookie: await Firebase.getUserCookie(intr.user.id),
				assessment_grade_id,
			});

			// copy components, disable button, then update as "confirmation" to user
			const components = intr.message.components;
			Object.assign(
				components
					.flatMap(({ components }) => components)
					// api is weird and return customId if cached, custom_id otherwise
					.find(({ custom_id, customId }) => (custom_id ?? customId) === intr.customId),
				{ disabled: true, style: 'SUCCESS', label: 'Marked as Read', emoji: { name: '✅' } }
			);
			await intr.update({ components });
		} catch (err) {
			Logger.error(`Error with btn ${this.name} ${intr.customId}: ${err}`);
			bot.intrReply({
				intr,
				ephemeral: true,
				embed: new EmbedBase().ErrorDesc('I ran into an error while trying to perform that action'),
			});
		}
	}
}

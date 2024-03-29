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

import bot from '../bot';
import { Logger, EmbedBase } from '.';

export class HealthManager {
	static #records = new Map();

	static record(event) {
		this.#records.set(event, Date.now());
		Logger.health(`recorded event: ${event}`);
	}

	static publishLogs() {
		const flags = [];
		// find all records that are older than 5min
		const fields = Array.from(this.#records).map(([event, date]) => {
			if (date < Date.now() - 300000) flags.push(event);
			return {
				name: `\`${event}\``,
				value: bot.formatTimestamp(date, 'R'),
				inline: true,
			};
		});

		const embed = new EmbedBase({
			title: 'Health Report',
			description: `Discord API Latency: ${bot.ws.ping}ms`,
			fields: [
				...(!!flags.length
					? [
							{
								name: 'Flags',
								value: flags.map((flag) => `\`${flag}\``).join('\n'),
							},
					  ]
					: []),
				...fields,
			],
		});
		!!flags.length && embed.Error();
		bot.logHealth({ embed, ...(!!flags.length && { content: '<@!139120967208271872> unhealthy status' }) });
	}
}

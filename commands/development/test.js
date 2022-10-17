/*
 * Copyright (C) 2022 Elijah Olmos
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
import { Command, EmbedBase, Firebase, Logger } from '../../classes';

class test extends Command {
	constructor() {
		super({
			name: 'test',
			description: 'Test command',
			category: 'development',
		});
	}

	async run({ intr }) {
		const classes = await Firebase.getAllClasses();
		Logger.debug(classes);

		await bot.intrReply({
			intr,
			embed: new EmbedBase({
				description: 'Done',
			}),
		});
	}
}

export default test;

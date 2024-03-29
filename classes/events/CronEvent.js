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
/**
 * Custom class for implementing scheduled cron events that will perform a particular task.
 * `run()` will be called every time the event is triggered.
 */
export class CronEvent {
	/**
	 *
	 * @param {Object} args Destructured arguments
	 * @param {string} args.name Name of the event (for logging purposes)
	 * @param {string} args.schedule Cron schedule expression
	 */
	constructor({ name = null, schedule = null }) {
		this.name = name;
		this.schedule = schedule;
		//import event config from bot config
		Object.assign(this, bot.config.events[this.name]);
	}

	run() {
		throw new Error(`CronEvent ${this.name} doesn't provide a run method.`);
	}
}

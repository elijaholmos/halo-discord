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

export class Command {
	constructor({
		name = null,
		description = '', //cannot be empty for chat commands
		options = [],
		category,
		deferResponse = false, //for commands that take longer to run
		type = 'CHAT_INPUT',
		...other
	}) {
		this.name = name;
		this.description = description;
		this.options = options;
		this.category = category;
		this.defaultMemberPermissions = ['admin', 'development'].includes(this.category) ? ['ADMINISTRATOR'] : null; //lock admin cmds
		this.deferResponse = deferResponse;
		this.type = type;
		Object.assign(this, other);
	}

	async run({ intr, opts }) {
		throw new Error(`Command ${this.constructor.name} doesn't provide a run method.`);
	}

	/**
	 * Adds all the properties of a registered `ApplicationCommand` to this `Command`
	 * @param {ApplicationCommand} appcmd A registered `ApplicationCommand`
	 * @returns {Command} This command itself
	 */
	setApplicationCommand(appcmd) {
		return Object.assign(this, appcmd);
	}
}

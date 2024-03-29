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

import { MessageActionRow } from 'discord.js';

export class ConfirmInteraction extends MessageActionRow {
	constructor({ custom_id_suffix = '' } = {}) {
		custom_id_suffix &&= custom_id_suffix + '-';
		super({
			components: [
				{
					type: 2,
					custom_id: `${custom_id_suffix}confirm`,
					style: 3,
					label: 'Confirm',
				},
				{
					type: 2,
					custom_id: `${custom_id_suffix}cancel`,
					style: 4,
					label: 'Cancel',
				},
			],
			type: 1,
		});
	}
}

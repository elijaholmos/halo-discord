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

// Bot configuration settings
export default {
	get production() {
		return {
			// Which users/roles get access to all commands
			command_perms: {
				categories: {
					moderator: [
						{
							// Moderator
							id: '904095889558212660',
							type: 'ROLE',
							permission: true,
						},
					],
					admin: [
						{
							// Moderator
							id: '904095889558212660',
							type: 'ROLE',
							permission: true,
						},
						{
							// staff
							id: '858144532318519326',
							type: 'ROLE',
							permission: true,
						},
					],
				},
			},
			main_guild_id: '270408632863031298',
			channels: {
				private_log: '928415523652374621',
				public_log: '928032754824802344',
				connection_log: '932058303779983470',
				cron_log: '1029803136367476807',
				log_401: '1036438412011507773',
				log_health: '1077445943865131018',
			},
			events: {},
			emoji: {},
			// bot.checkMod() returns true if user has any of these roles
			mod_roles: [
				'784875278593818694', //Admin
				'752363863441145866', //Mod
			],
		};
	},
	get development() {
		return {
			// Which users/roles get access to all commands
			command_perms: {
				categories: {
					moderator: [
						{
							// Moderator
							id: '904095889558212660',
							type: 'ROLE',
							permission: true,
						},
					],
					admin: [
						{
							// Moderator
							id: '904095889558212660',
							type: 'ROLE',
							permission: true,
						},
						{
							// staff
							id: '858144532318519326',
							type: 'ROLE',
							permission: true,
						},
					],
				},
			},
			main_guild_id: '270408632863031298',
			channels: {
				private_log: '928415523652374621',
				public_log: '270745162089496586',
				connection_log: '932058303779983470',
				cron_log: '1029803136367476807',
				log_401: '1036438412011507773',
				log_health: '1077445943865131018',
			},
			events: {},
			emoji: {},
			mod_roles: [
				'858144532318519326', //Staff
			],
		};
	},
	get staging() {
		return {
			...this.development,
		};
	},
};

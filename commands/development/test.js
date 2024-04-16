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
import { Command, Firebase, Halo, HealthManager } from '../../classes';

class test extends Command {
	constructor() {
		super({
			name: 'test',
			description: 'Test command',
			category: 'development',
		});
	}

	async run({ intr }) {
		try {
			HealthManager.publishLogs();
			// const feedback = await Halo.getGradeFeedback({
			// 	cookie,
			// 	assessment_id: '1454f632-ab98-4900-8858-452160a85b9c',
			// 	//TODO: shift to Firebase.getHaloUid() from a Firebase UID
			// 	uid: await Halo.getUserId({ cookie }),
			// });

			// console.log('assessment id', feedback.assessment.id);
			// console.log('feedback id', feedback.id);

			// const res = await Halo.acknowledgeGrade({
			// 	cookie,
			// 	assessment_grade_id: 'f6de9117-3204-4a28-ab0d-7d4939f20950',
			// });
			bot.intrReply({
				intr,
				content: 'test',
				components: [
					{
						components: [
							{
								type: 2,
								style: 1,
								custom_id: 'tos-agree-btn',
								disabled: false,
								label: 'Mark as Read',
								emoji: {
									name: '✉',
								},
							},
							{
								type: 2,
								style: 5,
								label: 'View Feedback',
								url: 'https://discord.com/channels/270408632863031298/928032710218383411',
							},
						],
						type: 1,
					},
				],
			});
		} catch (err) {
			console.log(err);
		}
	}
}

export default test;

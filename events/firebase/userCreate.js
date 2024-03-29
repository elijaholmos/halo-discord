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
import { CRON_USER_CLASS_STATUSES } from '../../caches';
import { EmbedBase, Firebase, FirebaseEvent, Halo, Logger, remove401 } from '../../classes';
import { auth, db } from '../../firebase';

class UserCreate extends FirebaseEvent {
	constructor() {
		super({
			name: 'UserCreate',
			description: 'Perform several operations when a user connects their Discord acct',
			ref: 'users',
		});
	}

	/**
	 *
	 * @param {DataSnapshot} snapshot
	 */
	async onAdd(snapshot) {
		const uid = snapshot.key;
		Logger.debug(`New user created: ${uid}: ${JSON.stringify(snapshot.val())}`);
		//retrieve and set their halo id (at this point, user should have halo cookie in db)
		const cookie = await Firebase.getUserCookie(uid, false);
		//await CookieManager.refreshUserCookie(uid, cookie); //immediately refresh cookie to trigger cache intervals
		const halo_id = await Halo.getUserId({ cookie });
		await db.ref(`users/${uid}`).child('halo_id').set(halo_id);

		//(attempt to) send connection message to user
		const user = await bot.users.fetch(uid);
		await bot.sendDM({
			user,
			send_disabled_msg: false,
			embed: new EmbedBase({
				title: 'Accounts Connected Successfully',
				description: 'You will now receive direct messages when certain things happen in Halo!',
			}).Success(),
		});
		//TODO implement send_disabled_msg

		//retrieve and set halo classes & grades
		//create grade_notifications dir if it doesn't exist
		//await mkdir('./' + relative(process.cwd(), 'cache/grade_notifications'), { recursive: true });
		//const grade_nofitication_cache = [];
		const { classes, userInfo } = await Halo.getUserOverview({ cookie, uid: halo_id });
		for (const { id, name, slugId, classCode, courseCode, stage, students } of classes.courseClasses) {
			await db.ref('classes').child(id).update({
				name,
				slugId,
				classCode,
				courseCode,
				stage,
			});
			await db
				.ref('user_classes_map')
				.child(uid)
				.child(id)
				.update({
					status: students.find(({ userId }) => userId === halo_id)?.status ?? 'UNKNOWN',
				});
			await db.ref('class_users_map').child(id).child(uid).set(true);

			//retrieve all published grades and store in cache
			// grade_nofitication_cache.push(
			// 	...(
			// 		await Halo.getAllGrades({
			// 			cookie,
			// 			class_slug_id: slugId,
			// 		})
			// 	)
			// 		.filter(({ status }) => status === 'PUBLISHED')
			// 		.map(({ assessment }) => assessment.id)
			// );
		}

		//write grade_notifications cache file
		// await writeFile(
		// 	'./' + relative(process.cwd(), `cache/grade_notifications/${uid}.json`),
		// 	JSON.stringify(grade_nofitication_cache)
		// );

		//send message to bot channel
		bot.logConnection({
			embed: new EmbedBase({
				title: 'New User Connected',
				fields: [
					{
						name: 'Discord User',
						value: bot.formatUser(user),
					},
					{
						name: 'Halo User',
						value: `${userInfo.firstName} ${userInfo.lastName} (\`${halo_id}\`)`,
					},
				],
			}),
		});
	}

	/**
	 *
	 * @param {DataSnapshot} snapshot
	 */
	async onModify(snapshot) {
		const uid = snapshot.key;
		const data = snapshot.val();
		Logger.debug(`doc ${uid} modified: ${JSON.stringify(data)}`);

		//at the moment, the only way to determine a reinstall is for these two conditions to be met:
		//1. ext_devices has been modified and set to 1
		//2. the `uninstalled` timestamp is present but the date is significantly in the past

		const uninstall_timestamp = data?.uninstalled;

		if (!Number.isInteger(uninstall_timestamp)) return;

		//extension uninstall process
		//if uninstall did not occur within the last 5 seconds, ignore
		//this is to allow other modifications to the user doc to occur without triggering the uninstall process
		if (Date.now() - uninstall_timestamp <= 5000) {
			const { halo_id, ext_devices } = data;

			Logger.uninstall(uid);

			//retrieve user info for uninstall message
			let { userInfo } =
				(await Halo.getUserOverview({
					cookie: await Firebase.getUserCookie(uid, false),
					uid: halo_id,
				}).catch(() => null)) ?? {};
			userInfo ??= {};

			//send message to bot channel
			bot.logConnection({
				embed: new EmbedBase({
					title: 'User Uninstalled',
					fields: [
						{
							name: 'Discord User',
							value: bot.formatUser(await bot.users.fetch(uid)),
							inline: true,
						},
						{
							name: 'Device Count',
							value: ext_devices.toString(),
							inline: true,
						},
						{
							name: 'Halo User',
							value: !Object.keys(userInfo).length
								? 'Unable to retrieve user info'
								: `${userInfo.firstName} ${userInfo.lastName} (\`${halo_id}\`)`,
						},
					],
				}).Error(),
			}).catch(() => {}); //noop

			if (ext_devices > 0) return; //don't delete user data if they have the ext installed on other devices

			//remove their discord tokens
			await db.ref(`discord_tokens/${uid}`).remove();

			//remove all classes they were in
			for (const id of await Firebase.getAllUserClasses(uid)) {
				await db.ref('user_classes_map').child(uid).child(id).remove();
				//await db.ref('classes').child(id).child('users').child(uid).remove();
				await db.ref('class_users_map').child(id).child(uid).remove();
			}

			//remove their cookies
			await Firebase.removeUserCookie(uid);
			//this triggers further cookie removal in CookieManager

			//remove their user doc
			await db.ref('users').child(uid).remove();

			//delete their user acct in case they reinstall, to retrigger the auth process
			await auth.deleteUser(uid);

			//remove user from cron job
			CRON_USER_CLASS_STATUSES.delete(uid);

			//remove user from 401 cache
			void remove401(uid);
		}

		//some more care needs to be given to the reinstall flow
		//can we just delete the user doc entirely? pros/cons
		//below conditional (may) get triggered in initial install flow bc of the updating of halo_id

		//if uninstall occurred "significantly" in the past
		//AND the ext_devices is 1, then the user has reinstalled the ext
		// else if (Date.now() - uninstall_timestamp >= 10000 && data.ext_devices === 1) {
		// 	//trigger initial install flow
		// 	this.onAdd(snapshot, true);
		// }
	}

	onRemove(snapshot) {
		Logger.debug(`Doc Deleted: ${JSON.stringify(snapshot.val())}`);
	}
}

export default UserCreate;

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

import { Encrypt, Firebase, Halo, Logger, remove401, handle401 } from '.';
import { COOKIES } from '../caches';
import { db } from '../firebase';
const { AUTHORIZATION_KEY, CONTEXT_KEY } = Halo;

export const isValueCookie = (val) => val.startsWith('eyJlbmMiOiJBMTI4R0NNIiwiYWxnIjoiZGlyIn0..');

/**
 * @returns {boolean}
 */
export const isValidCookieObject = function (obj) {
	return obj?.hasOwnProperty(AUTHORIZATION_KEY) && obj?.hasOwnProperty(CONTEXT_KEY);
};

/**
 * Ensure cookie object contains required keys and is not expired
 * @returns {Promise<boolean>}
 */
export const validateCookie = async function ({ cookie }) {
	try {
		const uid = await Halo.getUserId({ cookie });
		const overview = await Halo.getUserOverview({ cookie, uid });
		return !!uid && !!overview;
	} catch (error) {
		return false;
	}
};

export const decryptCookieObject = function (cookie) {
	try {
		const { [AUTHORIZATION_KEY]: auth, [CONTEXT_KEY]: context } = cookie;
		if (!auth || !context)
			throw new Error(`[decryptCookie] Unable to destructure cookie object, ${JSON.stringify(cookie)}`);

		const decrypted_auth = isValueCookie(auth) ? auth : Encrypt.decrypt(auth);
		const decrypted_context = isValueCookie(context) ? context : Encrypt.decrypt(context);

		if (
			!decrypted_auth ||
			!decrypted_context ||
			!isValueCookie(decrypted_auth) ||
			!isValueCookie(decrypted_context)
		)
			throw new Error(`[decryptCookie] Unable to decrypt cookie object, ${JSON.stringify(cookie)}`);

		return { ...cookie, [AUTHORIZATION_KEY]: decrypted_auth, [CONTEXT_KEY]: decrypted_context };
	} catch (e) {
		Logger.error(e);
		return null;
	}
};

export const encryptCookieObject = function (cookie) {
	try {
		const { [AUTHORIZATION_KEY]: auth, [CONTEXT_KEY]: context } = cookie;
		if (!auth || !context)
			throw new Error(`[encryptCookie] Unable to destructure cookie object, ${JSON.stringify(cookie)}`);

		const encrypted_auth = Encrypt.encrypt(auth);
		const encrypted_context = Encrypt.encrypt(context);

		if (!encrypted_auth || !encrypted_context)
			throw new Error(`[encryptCookie] Unable to encrypt cookie object, ${JSON.stringify(cookie)}`);

		return { ...cookie, [AUTHORIZATION_KEY]: encrypted_auth, [CONTEXT_KEY]: encrypted_context };
	} catch (e) {
		Logger.error(e);
		return null;
	}
};

// Watch for Cookie updates in Firebase and manually refresh Halo tokens when necessary
export class CookieManager {
	static REFRESH_INTERVAL = 1000 * 60 * 60 * 1.9; //1.9 hours
	static timeouts = new Map(); //to track and clear timeouts

	static async init() {
		const { timeouts, REFRESH_INTERVAL } = this;

		//create intervals
		let i = 0; //counter to track & return total number of intervals created
		for (const [uid, { cookie, next_update }] of COOKIES.entires) {
			timeouts.set(
				uid,
				setTimeout(() => this.refreshUserCookie(uid, cookie), Math.max(next_update - Date.now(), 0))
			);
			i++;
		}

		const updateHandler = async (snapshot) => {
			const uid = snapshot.key;
			const encrypted_cookie = snapshot.val();
			const next_update = Date.now() + REFRESH_INTERVAL;
			Logger.cookie(`${uid}'s cookie has been changed`);
			if (!isValidCookieObject(encrypted_cookie))
				return Logger.cookie(`Invalid cookie object detected for ${uid}: ${JSON.stringify(cookie)}`);

			const cookie = decryptCookieObject(encrypted_cookie);
			if (!isValidCookieObject(cookie))
				return Logger.cookie(`Unable to decrypt cookie for ${uid}, ${JSON.stringify(encrypted_cookie)}`);
			if (!(await validateCookie({ cookie })))
				return Logger.cookie(`Cookie for ${uid} failed to pass validation, ${JSON.stringify(cookie)}`);

			clearTimeout(timeouts.get(uid)); //clear timeout if it already exists for this user
			timeouts.set(
				uid,
				setTimeout(() => this.refreshUserCookie(uid, cookie), REFRESH_INTERVAL)
			);

			//update local cache
			COOKIES.set(uid, { cookie, next_update });
			await COOKIES.writeCacheFile({ filepath: uid, data: { cookie, next_update } });
			await remove401(uid);
		};

		//watch db for changes
		const ref = db.ref('cookies');
		ref.orderByChild('timestamp').startAt(Date.now()).on('child_added', updateHandler);
		ref.on('child_changed', updateHandler);
		//cookie was deleted, make sure it was due to an uninstall
		//don't want to be deleting server-side cookies accidentally
		ref.on('child_removed', async (snapshot) => {
			const uid = snapshot.key;
			//ext_devices should only be zero when the user has completely uninstalled
			if ((await Firebase.getFirebaseUserSnapshot(uid))?.ext_devices !== 0) return;

			Logger.cookie(`${uid}'s cookie has been removed`);
			clearTimeout(timeouts.get(uid)); //clear timeout if it already exists for this user
			this.deleteUserCookie(uid); //remove their cookie from cache
		});

		return i;
	}

	static async deleteUserCookie(uid) {
		//update local cache
		COOKIES.delete(uid);
		COOKIES.deleteCacheFile({ filepath: uid });
		return;
	}

	static async refreshUserCookie(uid, cookie, { count = 0 } = {}) {
		const { timeouts } = this;
		Logger.cookie(`Refreshing ${uid}'s cookie...`);
		try {
			const res = await Halo.refreshToken({ cookie });
			return await Firebase.updateUserCookie(uid, res);
		} catch (e) {
			Logger.cookie(`Error refreshing ${uid}'s cookie; count: ${count}`);
			Logger.cookie(e);
			if (count < 3) {
				clearTimeout(timeouts.get(uid)); //clear timeout if it already exists for this user
				//try again in 5 mins
				return timeouts.set(
					uid,
					setTimeout(() => this.refreshUserCookie(uid, cookie, { count: count + 1 }), 1000 * 60 * 5)
				);
			} else if (count === 3) {
				//set 60min timeout in case of extended outage
				clearTimeout(timeouts.get(uid)); //clear timeout if it already exists for this user
				return timeouts.set(
					uid,
					setTimeout(() => this.refreshUserCookie(uid, cookie, { count: count + 1 }), 1000 * 60 * 60)
				);
			}
			//count > 3
			await handle401({ uid, message: `Error refreshing ${uid}'s cookie: ${e}` });
		}
	}
}

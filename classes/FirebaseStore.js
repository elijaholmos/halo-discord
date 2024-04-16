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

//A local cache that stays in sync with Firestore but can be queried synchronously
import BiMap from 'bidirectional-map';
import { apps, db } from '../firebase';

export class FirebaseStore {
	_cache = new Map(); //immutablity implies that local changes do not sync w database
	ready = false; //true when initialization is complete
	constructor({
		path = null, //firebase path to watch
		bimap = false, //whether to use a bimap or a map
	} = {}) {
		this.bimap = bimap;
		// Synchronously load data from Firestore and
		// set up watcher to keep local cache up to date
		(function createCache() {
			if (apps.length === 0) return setTimeout(createCache.bind(this), 500); //wait until app is initialized
			db.ref(path).on('value', (snapshot) => {
				this._cache = snapshot.exists()
					? this.bimap
						? new BiMap(snapshot.val())
						: new Map(Object.entries(snapshot.val()))
					: new (this.bimap ? BiMap : Map)();

				this.ready ||= true;
			});
		}.bind(this)());
	}

	/**
	 *
	 * @returns {Promise<boolean>} Promise that resolves to true when class has finished initialization
	 */
	awaitReady() {
		const self = this;
		return new Promise((resolve) => {
			(function resolveReady() {
				self.ready ? resolve(true) : setTimeout(resolveReady, 500);
			})();
		});
	}

	get(id) {
		//if(this.cache.has(id)) throw new Error(`Could not find ${id} in ${this.constructor.name}`);
		return this._cache.get(id) ?? (this.bimap ? this._cache.getKey(id) : null);
	}

	keys() {
		return [...this._cache.keys()];
	}

	values() {
		return [...this._cache.values()];
	}

	entires() {
		return [...this._cache.entries()];
	}

	toObject() {
		return Object.fromEntries(this._cache.entries());
	}

	// Implement setter that updates local & cloud?
}

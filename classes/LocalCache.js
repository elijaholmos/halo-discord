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

import klaw from 'klaw';
import { get, has, set, unset } from 'lodash-es';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { parse, relative, sep } from 'node:path';

export class LocalCache {
	/**
	 *
	 * @param {Object} args Desctructured arguments
	 * @param {String} args.path The filepath for the cache fiels
	 * @param {'map' | 'object'} [args.type] The type of cache. Defaults to `map`
	 */
	constructor({ path, type = 'map' }) {
		if (!path.startsWith('cache/')) path = `cache/${path}`;
		this.path = path;
		this.type = type;
		this._cache = type === 'map' ? new Map() : {};
	}

	get get() {
		const { _cache, type } = this;
		return type === 'map' ? _cache.get.bind(_cache) : (path, defaultValue = []) => get(_cache, path, defaultValue);
	}

	get set() {
		const { _cache, type } = this;
		return type === 'map' ? _cache.set.bind(_cache) : (path, value) => set(_cache, path, value);
	}

	get has() {
		const { _cache, type } = this;
		return type === 'map' ? _cache.has.bind(_cache) : (path) => has(_cache, path);
	}

	get update() {
		const isLiteralObject = (o) => !!o && o.constructor === Object; //https://stackoverflow.com/a/16608074/8396479

		return (path, value) => {
			const old = this.get(path);
			if (isLiteralObject(old) && isLiteralObject(value)) value = { ...old, ...value };
			else if (Array.isArray(old) && Array.isArray(value)) value = [...old, ...value];

			return this.set(path, value);
		};
	}

	get delete() {
		const { _cache, type } = this;
		return type === 'map' ? _cache.delete.bind(_cache) : (path) => unset(_cache, path);
	}

	get size() {
		const { _cache, type } = this;
		return type === 'map' ? _cache.size : Object.keys(_cache).length;
	}

	get entires() {
		const { _cache, type } = this;
		return type === 'map' ? [..._cache.entries()] : Object.entries(_cache);
	}

	get writeCacheFile() {
		return this.#writeCacheFile.bind(this);
	}

	get deleteCacheFile() {
		return this.#deleteCacheFile.bind(this);
	}

	/**
	 * import local cache files and reconstruct the LocalCache
	 */
	async loadCacheFiles() {
		const { path, type, _cache } = this;

		//create dir first, if it does not exist
		await mkdir('./' + relative(process.cwd(), path), { recursive: true });

		if (type === 'map')
			for await (const item of klaw('./' + relative(process.cwd(), path))) {
				const file_path = parse(item.path);
				if (file_path?.ext !== '.json') continue; //ignore directories and non-json files
				try {
					const parsedJson = JSON.parse(await readFile(item.path, 'utf8').catch(() => '[]'));
					_cache.set(file_path.name.split('.')[0], parsedJson);
				} catch (e) {
					console.log('caught map error');
					console.log(e);
					console.log(`${file_path.dir}, ${file_path.name}`);
					await rm(item.path, { force: true });
				}
			}
		else
			for await (const item of klaw('./' + relative(process.cwd(), path))) {
				const file_path = parse(item.path);
				if (file_path?.ext !== '.json') continue; //ignore directories and non-json files

				try {
					const parsedJson = JSON.parse(await readFile(item.path, 'utf8').catch(() => '[]'));
					set(_cache, [file_path.dir.split(sep).pop(), file_path.name], parsedJson);
				} catch (e) {
					console.log('caught non-map error');
					console.log(e);
					console.log(`${file_path.dir}, ${file_path.name}`);
					await rm(item.path, { force: true });
				}
			}
	}

	/**
	 * @param {Object} args Desctructured arguments
	 * @param {String} args.filepath filepath to be written to (can be nested)
	 * @param {any} args.data JSON-stringify-able data to be written to the file
	 */
	async #writeCacheFile({ filepath, data }) {
		const { path } = this;
		if (!filepath.endsWith('.json')) filepath += '.json';
		//create dir if it does not exist
		await mkdir('./' + relative(process.cwd(), parse(`${path}/${filepath}`).dir), { recursive: true });
		return writeFile('./' + relative(process.cwd(), `${path}/${filepath}`), JSON.stringify(data));
	}

	/**
	 * @param {Object} args Desctructured arguments
	 * @param {String} args.filepath filepath to be deleted to (can be nested)
	 */
	async #deleteCacheFile({ filepath }) {
		const { path } = this;
		if (!filepath.endsWith('.json')) filepath += '.json';
		//create dir if it does not exist
		await mkdir('./' + relative(process.cwd(), parse(`${path}/${filepath}`).dir), { recursive: true });
		return rm('./' + relative(process.cwd(), `${path}/${filepath}`), { force: true });
	}
}

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

import chalk from 'chalk';
import moment from 'moment';
import fs from 'node:fs/promises';
import path from 'node:path';
import { serializeError } from 'serialize-error';

export class Logger {
	static async log(content, type = 'log') {
		const timestamp = `[${chalk.white(moment().format('YYYY-MM-DD HH:mm:ss'))}]`;
		type !== 'error' && !!content && content.constructor === Object && (content = JSON.stringify(content));
		switch (type) {
			case 'log': {
				//create file first, if it does not exist
				await fs.mkdir('./' + path.relative(process.cwd(), 'log/'), { recursive: true });
				fs.appendFile(
					'./' + path.relative(process.cwd(), 'log/log.log'),
					`[${moment().format('YYYY-MM-DD HH:mm:ss')}]: ${content}\n`
				);
				return console.log(`${timestamp} [${chalk.bgBlue(` ${type.toUpperCase()} `)}]: ${content}`);
			}
			case 'warn': {
				return console.log(`${timestamp} [${chalk.black.bgYellow(type.toUpperCase())}]: ${content}`);
			}
			case 'error': {
				//create file first, if it does not exist
				await fs.mkdir('./' + path.relative(process.cwd(), 'log/'), { recursive: true });
				fs.appendFile(
					'./' + path.relative(process.cwd(), 'log/error.log'),
					`[${moment().format('YYYY-MM-DD HH:mm:ss')}]: ${JSON.stringify(serializeError(content))}\n`
				);
				return console.log(`${timestamp} [${chalk.bgRed(type.toUpperCase())}]: ${content}`);
			}
			case 'debug': {
				//create file first, if it does not exist
				await fs.mkdir('./' + path.relative(process.cwd(), 'log/'), { recursive: true });
				fs.appendFile(
					'./' + path.relative(process.cwd(), 'log/debug.log'),
					`[${moment().format('YYYY-MM-DD HH:mm:ss')}]: ${content}\n`
				);
				return console.log(`${timestamp} [${chalk.green(type.toUpperCase())}]: ${content}`);
			}
			case 'cmd': {
				return console.log(`${timestamp} [${chalk.black.bgWhite(` ${type.toUpperCase()} `)}]: ${content}`);
			}
			case 'intr': {
				return console.log(`${timestamp} [${chalk.black.bgWhite(type.toUpperCase())}]: ${content}`);
			}
			case 'ready': {
				return console.log(`${timestamp} [${chalk.black.bgGreen(type.toUpperCase())}]: ${content}`);
			}
			case 'uninstall': {
				//create file first, if it does not exist
				await fs.mkdir('./' + path.relative(process.cwd(), 'log/'), { recursive: true });
				fs.appendFile(
					'./' + path.relative(process.cwd(), 'log/uninstall.log'),
					`[${moment().format('YYYY-MM-DD HH:mm:ss')}]: ${content}\n`
				);
				return console.log(`${timestamp} [${chalk.yellow(type.toUpperCase())}]: ${content}`);
			}
			case 'unauth': {
				//create file first, if it does not exist
				await fs.mkdir('./' + path.relative(process.cwd(), 'log/'), { recursive: true });
				fs.appendFile(
					'./' + path.relative(process.cwd(), 'log/unauth.log'),
					`[${moment().format('YYYY-MM-DD HH:mm:ss')}]: ${content}\n`
				);
				return; //don't output to console
			}
			case 'cookie': {
				//create file first, if it does not exist
				await fs.mkdir('./' + path.relative(process.cwd(), 'log/'), { recursive: true });
				fs.appendFile(
					'./' + path.relative(process.cwd(), 'log/cookie.log'),
					`[${moment().format('YYYY-MM-DD HH:mm:ss')}]: ${content}\n`
				);
				return console.log(`${timestamp} [${chalk.grey(type.toUpperCase())}]: ${content}`);
			}
			case 'cron': {
				//create file first, if it does not exist
				await fs.mkdir('./' + path.relative(process.cwd(), 'log/'), { recursive: true });
				fs.appendFile(
					'./' + path.relative(process.cwd(), 'log/cron.log'),
					`[${moment().format('YYYY-MM-DD HH:mm:ss')}]: ${content}\n`
				);
				return console.log(`${timestamp} [${chalk.bgYellow(type.toUpperCase())}]: ${content}`);
			}
			default:
				throw new TypeError('Unknown log type');
		}
	}

	static error(content) {
		return this.log(content, 'error');
	}

	static warn(content) {
		return this.log(content, 'warn');
	}

	static debug(content) {
		return this.log(content, 'debug');
	}

	static cmd(content) {
		return this.log(content, 'cmd');
	}

	static intr(content) {
		return this.log(content, 'intr');
	}

	static ready(content) {
		return this.log(content, 'ready');
	}

	static uninstall(content) {
		return this.log(content, 'uninstall');
	}

	static unauth(content) {
		return this.log(content, 'unauth');
	}

	static cookie(content) {
		return this.log(content, 'cookie');
	}

	static cron(content) {
		return this.log(content, 'cron');
	}
}

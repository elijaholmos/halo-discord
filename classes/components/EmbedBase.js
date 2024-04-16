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

import { MessageEmbed } from 'discord.js';
import { truncate } from 'lodash-es';
import bot from '../../bot';

/**
 * A function for splitting a string into fixed-length parts. Designed as a
 * workaround to an issue in the discord.js Util.splitMessage function
 * https://github.com/discordjs/discord.js/issues/7674
 * @author dshepsis
 * @see {@link https://github.com/discordjs/discord.js/issues/7674#issuecomment-1073273262 Github issue}
 * @param {string} text The string to split into multiple messages, each of
 * which will be no longer than maxLength
 * @param {object} [options]
 * @param {number} [options.maxLength] The maximum number of characters in each
 * string in the returned array
 * @param {RegExp} [options.regex] A global regex which matches the delimeters on
 * which to split text when needed to keep each part within maxLength
 * @param {string} [options.prepend] A string to add before each part iff
 * text is split into multiple parts
 * @param {string} [options.append] A string to add after each part iff text
 * is split into multiple parts
 * @returns {string[]} An array of strings which are substrings of text, split
 * using options.regex, combined such that each part is as long as possible
 * while not exceeding options.maxLength.
 */
function splitMessageRegex(text, { maxLength = 2_000, regex = /\n/g, prepend = '', append = '' } = {}) {
	if (text.length <= maxLength) return [text];
	const parts = [];
	let curPart = prepend;
	let chunkStartIndex = 0;

	let prevDelim = '';

	function addChunk(chunkEndIndex, nextDelim) {
		const nextChunk = text.substring(chunkStartIndex, chunkEndIndex);
		const nextChunkLen = nextChunk.length;

		// If a single part would exceed the length limit by itself, throw an error:
		if (prepend.length + nextChunkLen + append.length > maxLength) {
			throw new RangeError('SPLIT_MAX_LEN');
		}

		// The length of the current part if the next chunk were added to it:
		const lengthWithChunk = curPart.length + prevDelim.length + nextChunkLen + append.length;

		// If adding the next chunk to the current part would cause it to exceed
		// the maximum length, push the current part and reset it for next time:
		if (lengthWithChunk > maxLength) {
			parts.push(curPart + append);
			curPart = prepend + nextChunk;
		} else {
			curPart += prevDelim + nextChunk;
		}
		prevDelim = nextDelim;
		chunkStartIndex = chunkEndIndex + prevDelim.length;
	}

	for (const match of text.matchAll(regex)) {
		addChunk(match.index, match[0]);
	}
	addChunk(text.length - 1, '');
	parts.push(curPart + append);
	return parts;
}

//base Embed object, customized for this project
export class EmbedBase extends MessageEmbed {
	constructor({
		color = 0x2ea2e0,
		title,
		url,
		author = {},
		description,
		thumbnail = {},
		fields = [],
		image = {},
		timestamp = new Date(),
		footer = '',
		...other
	} = {}) {
		super({
			color,
			title,
			url,
			author: author ?? {},
			description,
			thumbnail,
			fields,
			image,
			timestamp,
			footer: {
				text: `${typeof footer === 'string' ? (footer &&= footer + ' • ') : ''}Halo Notification Service ${
					bot.CURRENT_VERSION
				}`,
				icon_url: bot.user.avatarURL(),
			},
			...other,
		});
		return this.cleanup();
	}

	get char_count() {
		// console.log(this.fields.reduce((acc, f) => acc + f.name.length + f.value.length, 0));
		// console.log(this.fields);
		return (
			(this.title?.length || 0) +
			(this.description?.length || 0) +
			(this.footer?.text?.length || 0) +
			(this.author?.name?.length || 0) +
			this.fields.reduce((acc, f) => acc + f.name.length + f.value.length, 0)
		);
	}

	// --------- Utility ---------

	// Ensure an embed stays within Discord's embed limits
	// https://discord.com/developers/docs/resources/channel#embed-limits
	cleanup() {
		this.title &&= truncate(this.title.trim(), { length: 255, omission: '\u2026' });
		this.description &&= truncate(this.description.trim(), { length: 4095, omission: '\u2026' });
		// I'd like to split the embeds before slicing fields, if possible
		this.fields = this.fields
			.flatMap((f) => this.splitField(f))
			.slice(0, 25)
			.map((f) => ({
				...f,
				name: truncate(f.name.trim(), { length: 255, omission: '\u2026' }),
				value: truncate(f.value.trim(), { length: 1023, omission: '\u2026' }),
			}));
		this.footer.text &&= truncate(this.footer.text.trim(), { length: 2047, omission: '\u2026' });
		this.author.name &&= truncate(this.author.name.trim(), { length: 255, omission: '\u2026' });

		if (this.char_count > 6000) return this.splitEmbed(this);

		return this;
	}

	/**
	 * Recursively splits an embed into multiple embeds if it exceeds the Discord embed limits.
	 * @returns {EmbedBase[]} An array of split embeds
	 */
	splitEmbed({ fields = this.fields, embeds = [], ...other } = {}) {
		if (!fields.length) return embeds;
		const embed = new EmbedBase(other);
		embeds.push(embed);
		while (embed.char_count < 6000 && !!fields.length) {
			embed.fields.push(fields.shift());
		}
		//remove the last field of this embed because we ended up going over 6000 when exiting the loop
		if (embed.char_count > 6000) fields.unshift(embed.fields.pop());
		return this.splitEmbed({ fields, embeds });
	}

	/**
	 * Splits a single embed field into multiple fields if it exceeds the Discord embed limits.
	 * Each embed field will have the passed `args.name` with " (x of y)" appended to it,
	 * if multiple fields are created.
	 * @param {Object} args Destructured arguments
	 * @param {string} args.name Name of the embed field
	 * @param {string} args.value Value of the embed field
	 * @param {RegExp} [args.regex] Regex separator to use when determining character count
	 * @param {boolean} [args.inline] Whether the embed fields should all be inline
	 * @returns {Array<Object>} An array of split embed fields
	 */
	splitField({ name, value, regex = /\n/g, inline = false } = {}) {
		return splitMessageRegex(value, { regex, maxLength: 1024 })
			.reduce(
				(acc, val) => {
					const charcount = acc[acc.length - 1].join().length;
					charcount + val.length > 1024 ? acc.push([val]) : acc[acc.length - 1].push(val);
					return acc;
				},
				[[]]
			)
			.map((v, i, a) => ({
				name: `${name} ${a.length > 1 ? `(${i + 1} of ${a.length})` : ''}`,
				value: v.join(regex),
				inline,
			}));
	}

	// --------- Presets ---------
	Error() {
		this.color = 0xf5223c;
		return this;
	}

	ErrorDesc(msg) {
		this.description = `❌ **${msg}**`;
		return this.Error();
	}

	Warn() {
		this.color = 0xf5a122; //0xf59a22 for slightly less bright
		return this;
	}

	Success() {
		this.color = 0x31d64d;
		return this;
	}

	Sentence() {
		this.color = 0xe3da32;
		return this;
	}
}

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

import { constants, createCipheriv, createDecipheriv, privateDecrypt, publicEncrypt, randomBytes } from 'node:crypto';
const AES_ALGORITHM = 'aes-256-gcm';

/**
 * @param {string} input Base64 encoded string to be AES encrypted
 */
const aesEncrypt = function (input) {
	const aes_key = randomBytes(32);
	const nonce = randomBytes(12);
	const cipher = createCipheriv(AES_ALGORITHM, aes_key, nonce);
	const encrypted = Buffer.concat([cipher.update(input, 'base64'), cipher.final()]);

	return {
		value: encrypted.toString('base64'),
		auth_tag: cipher.getAuthTag().toString('base64'),
		nonce: nonce.toString('base64'),
		aes_key: aes_key.toString('base64'),
	};
};

const aesDecrypt = function ({ aes_key, auth_tag, nonce, value }) {
	const decipher = createDecipheriv(
		AES_ALGORITHM,
		Buffer.from(aes_key, 'base64'),
		Buffer.from(nonce, 'base64')
	).setAuthTag(Buffer.from(auth_tag, 'base64'));

	return Buffer.concat([decipher.update(value, 'base64'), decipher.final()]).toString('base64');
};

/**
 * @param {string} input base64 encoded string
 * @returns {string} base64 encoded string
 */
const rsaEncrypt = function (input) {
	const encrypted = publicEncrypt(
		{
			key: Buffer.from(process.env.RSA_PUBLIC_KEY, 'base64'),
			oaepHash: 'sha256',
			padding: constants.RSA_PKCS1_OAEP_PADDING,
		},
		Buffer.from(input, 'base64')
	);

	return encrypted.toString('base64');
};

/**
 * @param {string} input base64 encoded string
 * @returns {string} base64 encoded string
 */
const rsaDecrypt = function (input) {
	return privateDecrypt(
		{
			key: Buffer.from(process.env.RSA_PRIVATE_KEY, 'base64'),
			oaepHash: 'sha256',
			padding: constants.RSA_PKCS1_OAEP_PADDING,
		},
		Buffer.from(input, 'base64')
	).toString('base64');
};

/**
 * Apply a hybrid AES/RSA encryption algorithm to a utf-8 string
 * @param {string} input utf-8 encoded data payload to be encrypted
 * @returns {string} Encrypted utf-8 string of the structure `{aes_key}:{auth_tag}:{nonce}:{value}`. Each component is base64 encoded.
 */
export const encrypt = function (input) {
	const { aes_key, auth_tag, nonce, value } = aesEncrypt(Buffer.from(input).toString('base64'));
	const ekey = rsaEncrypt(aes_key);
	return [ekey, nonce, auth_tag, value].join(':');
};

/**
 * Decrypts a string encrypted with a hybrid AES/RSA algorithm
 * @param {string} input Encrypted utf-8 string of the structure `{aes_key}:{auth_tag}:{nonce}:{value}`. Each component is base64 encoded.
 * @returns Decrypted data payload, utf-8 encoded
 */
export const decrypt = function (input) {
	const [ekey, nonce, auth_tag, value] = input.split(':');
	const res = aesDecrypt({ aes_key: rsaDecrypt(ekey), auth_tag, nonce, value });
	return Buffer.from(res, 'base64').toString();
};

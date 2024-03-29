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

import express from 'express';
import { GatewayController } from '../controllers';

const router = express.Router();
const unauth = {
	errors: [
		{
			message: '401: Unauthorized',
			extensions: {
				code: 'UNAUTHENTICATED',
				response: {
					status: 401,
					statusText: 'Unauthorized',
					body: {
						timestamp: Date.now(),
						status: 401,
						error: 'Unauthorized',
						message: '',
						path: '/graphql',
					},
				},
			},
		},
	],
};

router.post('/', async (req, res) => {
	//return res.status(200).send(unauth);
	const { operationName, variables = {} } = req.body;
	console.log(`operationName: ${operationName}`);
	res.send(await GatewayController[operationName](variables));
});

export { router as gateway };

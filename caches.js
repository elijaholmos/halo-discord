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

import { LocalCache } from './classes';

// map should be used for single-depth cache structures
export const CLASS_ANNOUNCEMENTS = new LocalCache({ path: 'class_announcements' });
export const USER_GRADES = new LocalCache({ path: 'user_grades', type: 'object' });
export const USER_INBOX = new LocalCache({ path: 'user_inbox', type: 'object' });
/*
    { 
        classId: {
            classCode: string
            courseCode: string
            name: string
            slugId: string
            stage: string
        }
    }
 */
export const CRON_CLASS_STAGES = new LocalCache({ path: 'cron/class_stages' });
/*
    { uid: { classId: { status: 'STATUS' } }, classId2: { status: 'STATUS2' } }
*/
export const CRON_USER_CLASS_STATUSES = new LocalCache({ path: 'cron/class_user_statuses' });
export const COOKIES = new LocalCache({ path: 'cookies' });
export const USER_401s = new LocalCache({ path: 'user_401s' });

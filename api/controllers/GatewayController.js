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

import GetAnnouncementsStudent from '../data/GetAnnouncementsStudent';
import GradeOverview from '../data/GradeOverview';
import GetAssessmentFeedback from '../data/GetAssessmentFeedback';
import HeaderFields from '../data/HeaderFields';

export class GatewayController {
	static GetAnnouncementsStudent({ courseClassId }) {
		return GetAnnouncementsStudent;
	}
	static GradeOverview({ courseClassSlugId, courseClassUserIds }) {
		return GradeOverview;
	}
	static GetAssessmentFeedback({ assessmentId, userId }) {
		return GetAssessmentFeedback;
	}
	static HeaderFields({ userId: uid, skipClasses, skipInboxCount }) {
		return HeaderFields;
	}
}

/* schemas/submission -- schema for code submission.
 * Copyright (C) 2022  Rishvic Pushpakaran
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.  */

import Joi from 'joi'

export type SubmissionMeta = {
  lang: 'gcc' | 'g++' | 'java' | 'python'
}

const submissionSchema = Joi.object<SubmissionMeta>({
  lang: Joi.string().required().valid('gcc', 'g++', 'java', 'python'),
})

export default submissionSchema
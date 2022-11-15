/* config/db.ts -- configuration for the MongoDB client
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

import type { ObjectId } from 'mongodb'
import { MongoClient, ServerApiVersion } from 'mongodb'
import { MONGO_URL } from './settings'

const client = new MongoClient(MONGO_URL, {
  serverApi: ServerApiVersion.v1,
})

export type Problem = {
  slug: string
  contest: ObjectId | null
}

export type SubmissionStatus = 'SUB' | 'COMP' | 'AC' | 'WA' | 'TLE' | 'ERR'

export type Submission = {
  problem: ObjectId
  object: string
  etag: string
  status: SubmissionStatus
}

export const problemsDb = client.db('problems')
export const problems = problemsDb.collection<Problem>('problems')
export const submissions = problemsDb.collection<Submission>('submissions')

export default client

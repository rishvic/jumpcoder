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
  lang: string
  object: string
  etag: string
  status: SubmissionStatus
}

export type Argon2Password = {
  type: 'argon2'
  hash: string
}

export type Password = Argon2Password

export type Profile = {
  name: string
  familyName?: string
  givenName?: string
}

export type User = {
  username: string
  password: Password
  profile: Profile
}

export type Role = 'primary' | 'secondary'

export type Membership = {
  userId: ObjectId
  accountId: ObjectId
  role: Role
  email: string
}

export type PlanLevel = 'personal'

export type Account = {
  name: string
  planLevel: PlanLevel
}

export const problemsDb = client.db('problems')
export const problems = problemsDb.collection<Problem>('problems')
export const submissions = problemsDb.collection<Submission>('submissions')

export const usersDb = client.db('users')
export const users = usersDb.collection<User>('users')
export const memberships = usersDb.collection<Membership>('memberships')
export const accounts = usersDb.collection<Account>('accounts')

export default client

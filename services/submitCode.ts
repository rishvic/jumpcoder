/* services/submitCode.ts -- service to upload info of submitted code.
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

import type { SubmissionMeta } from '@schemas/submission'
import type { UploadedFile } from '@utils/getParts'
import type { InsertOneResult, TransactionOptions } from 'mongodb'
import type { Submission as DbSubmission } from '@config/db'
import createError from 'http-errors'
import dbClient, { problems, submissions } from '@config/db'

export type Submission = {
  meta: SubmissionMeta
  code: UploadedFile
}

export default async function submitCode(
  problemSlug: string,
  uploaded: Submission
) {
  const problem = await problems.findOne({ slug: problemSlug })
  if (problem === null) {
    throw new createError.NotFound(
      `problem ${JSON.stringify(problemSlug)} not found`
    )
  }

  const transactionOptions: TransactionOptions = {
    readPreference: 'primary',
    readConcern: { level: 'local' },
    writeConcern: { w: 'majority' },
    maxCommitTimeMS: 1000,
  }

  const insertedSubInfo = await new Promise<InsertOneResult<DbSubmission>>(
    function (resolve, reject) {
      return dbClient
        .withSession(async function (session) {
          await session.withTransaction(async function (session) {
            const sameCheck = await submissions.findOne(
              {
                problem: problem._id,
                lang: uploaded.meta.lang,
                etag: uploaded.code.s3Info.etag,
              },
              { session }
            )
            if (sameCheck !== null) {
              throw new createError.BadRequest('Same submission already exists')
            }

            const insertedSubInfo = await submissions.insertOne(
              {
                problem: problem._id,
                lang: uploaded.meta.lang,
                object: uploaded.code.objectName,
                etag: uploaded.code.s3Info.etag,
                status: 'SUB',
              },
              { session }
            )
            resolve(insertedSubInfo)
          }, transactionOptions)
        })
        .catch(reject)
    }
  )

  return insertedSubInfo
}

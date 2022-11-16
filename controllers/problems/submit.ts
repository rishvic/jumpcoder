/* controllers/problems/submit.ts -- controller functions code submission.
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

import type { NextApiHandler } from 'next'
import type { Submission } from '@services/submitCode'
import type { FormParts } from '@utils/getParts'
import busboy from 'busboy'
import createError from 'http-errors'
import { ValidationError } from 'joi'
import { getLogger } from '@config/logging'
import { MAX_FILE_SIZE } from '@config/settings'
import submissionSchema from '@schemas/submission'
import submitCode from '@services/submitCode'
import getParts, { cleanUpFiles } from '@utils/getParts'
const logger = getLogger({ module: '@controllers/problems/submit' })

export const submitProblem: NextApiHandler = async function submitProblem(
  req,
  res
) {
  let parts: FormParts | undefined
  try {
    const bb = busboy({
      headers: req.headers,
      limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    })

    req.pipe(bb)
    parts = await getParts(bb)
    const uploaded = await validateParts(parts)

    const problemSlug = req.query['slug'] as string
    const submissionResult = await submitCode(problemSlug, uploaded)

    res.status(201).json({
      id: submissionResult.insertedId,
      problem: problemSlug,
      lang: uploaded.meta.lang,
    })
  } catch (err) {
    if (err instanceof ValidationError) {
      if (err.details.length >= 1 && err.details[0].type === 'file.size')
        res.status(413).json(err.details)
      else res.status(400).json(err.details)
    } else if (createError.isHttpError(err)) {
      if (err.headers) {
        for (const header in err.headers) {
          res.setHeader(header, err.headers[header])
        }
      }
      res
        .status(err.statusCode)
        .setHeader('Content-Type', 'text/plain')
        .send(err.message)
    } else {
      logger.error({ error: err }, 'Unknown error while uploading file')
      res
        .status(500)
        .setHeader('Content-Type', 'text/plain')
        .send('Internal Server Error')
    }

    if (parts) {
      await cleanUpFiles(parts.files)
    }
  }
}

async function validateParts({ fields, files }: FormParts) {
  const fileField = 'code'
  if (files.length < 1) {
    const message = `${JSON.stringify(fileField)} is required`
    throw new ValidationError(
      message,
      [
        {
          message,
          path: [fileField],
          type: 'any.required',
          context: {
            label: fileField,
            key: fileField,
          },
        },
      ],
      null
    )
  }

  const file = files[0]
  if (file.stream.truncated) {
    const message = `${JSON.stringify(
      fileField
    )} size must be less than or equal to ${MAX_FILE_SIZE}B`
    throw new ValidationError(
      message,
      [
        {
          message,
          path: [fileField],
          type: 'file.size',
          context: {
            label: fileField,
            key: fileField,
            limit: MAX_FILE_SIZE,
            encoding: file.info.encoding,
          },
        },
      ],
      null
    )
  }

  const meta = await submissionSchema.validateAsync(fields)
  const submission: Submission = {
    meta,
    code: file,
  }

  return submission
}

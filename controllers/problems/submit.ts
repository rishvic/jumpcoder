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

import type { Readable } from 'stream'
import type { NextApiHandler } from 'next'
import type { Busboy, FileInfo } from 'busboy'
import type { UploadedObjectInfo } from 'minio'
import type { ClientSession, TransactionOptions } from 'mongodb'
import type { SubmissionMeta } from '@schemas/submission'
import { randomBytes } from 'crypto'
import busboy from 'busboy'
import createError from 'http-errors'
import { ValidationError } from 'joi'
import pino from 'pino'
import dbClient, { problemsDb, problems, submissions } from '@config/db'
import s3Client from '@config/s3'
import { LOGLEVEL, MAX_FILE_SIZE, S3_CODE_BUCKET } from '@config/settings'
import submissionSchema from '@schemas/submission'
const logger = pino({ level: LOGLEVEL })

export type UploadedFile = {
  fieldName: string
  bucketName: string
  objectName: string
  stream: Readable & { truncated?: boolean }
  info: FileInfo
  s3Info: UploadedObjectInfo
}

export type Submission = {
  meta: SubmissionMeta
  code: UploadedFile
}

type FormParts = {
  fields: Record<string, string>
  files: UploadedFile[]
}

export const submitProblem: NextApiHandler = async function submitProblem(
  req,
  res
) {
  let parts: FormParts | undefined
  let session: ClientSession | undefined
  try {
    const bb = busboy({
      headers: req.headers,
      limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    })

    req.pipe(bb)
    parts = await getParts(bb)
    const uploaded = await validateParts(parts)

    const problemSlug = req.query['slug'] as string
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
    const session = dbClient.startSession()
    let id: string | undefined
    await session.withTransaction(async function (session) {
      const sameCheck = await submissions.findOne(
        {
          problem: problem._id,
          etag: uploaded.code.s3Info.etag,
        },
        { session }
      )
      if (sameCheck !== null) {
        throw new createError.BadRequest('Same submission already exists')
      }

      const submission = await submissions.insertOne(
        {
          problem: problem._id,
          object: uploaded.code.objectName,
          etag: uploaded.code.s3Info.etag,
          status: 'SUB',
        },
        { session }
      )
      id = submission.insertedId.toString()
    }, transactionOptions)

    res.status(201).json({
      id,
      problem: problem.slug,
      lang: uploaded.meta.lang,
    })
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json(err.details)
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
  } finally {
    if (session) await session.endSession()
  }
}

async function getParts(bb: Busboy) {
  const parts: FormParts = {
    fields: {},
    files: [],
  }
  parts.files = await new Promise<UploadedFile[]>(function (resolve, reject) {
    const promises: Promise<UploadedFile>[] = []

    bb.on('field', function (name, value, _info) {
      parts.fields[name] = value
    })
    bb.on('file', function (name, stream, info) {
      promises.push(
        new Promise<UploadedFile>(function (resolve, reject) {
          randomBytes(24, function (err, buf) {
            if (err) {
              reject(err)
              stream.resume()
              return
            }
            const objectName = buf.toString('base64url')
            s3Client.putObject(
              S3_CODE_BUCKET,
              objectName,
              stream,
              function (err, res) {
                if (err) {
                  reject(err)
                  stream.resume()
                  return
                }

                const file: UploadedFile = {
                  fieldName: name,
                  bucketName: S3_CODE_BUCKET,
                  objectName: objectName,
                  stream: stream,
                  info,
                  s3Info: res,
                }
                logger.debug(
                  {
                    file: {
                      bucketName: {
                        bucketName: file.bucketName,
                        objectName: file.objectName,
                        s3Info: res,
                      },
                    },
                  },
                  `Uploaded object ${JSON.stringify(
                    objectName
                  )} in bucket ${JSON.stringify(S3_CODE_BUCKET)}`
                )
                resolve(file)
              }
            )
          })
        })
      )
    })
    bb.on('close', function () {
      resolve(Promise.all(promises))
    })
    bb.on('error', function (err) {
      reject(err)
    })
  })

  return parts
}

async function cleanUpFiles(files: UploadedFile[]) {
  await Promise.all(
    files.map(function (file) {
      return new Promise<void>(function (resolve, reject) {
        s3Client.removeObject(file.bucketName, file.objectName, function (err) {
          if (err) {
            logger.error(
              { error: err },
              `failed to remove object ${JSON.stringify(
                file.objectName
              )} from bucket ${JSON.stringify(file.bucketName)}`
            )
            reject(err)
            return
          }

          logger.debug(
            {
              file: {
                bucketName: {
                  bucketName: file.bucketName,
                  objectName: file.objectName,
                },
              },
            },
            `Removed object ${JSON.stringify(
              file.objectName
            )} from bucket ${JSON.stringify(file.bucketName)}`
          )
          resolve()
        })
      })
    })
  )
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

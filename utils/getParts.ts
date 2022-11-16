/* utils/getParts.ts -- get fields and files from multipart/form-data
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
import type { Busboy, FileInfo } from 'busboy'
import type { UploadedObjectInfo } from 'minio'
import { randomBytes } from 'crypto'
import s3Client from '@config/s3'
import { getLogger } from '@config/logging'
import { S3_CODE_BUCKET } from '@config/settings'

const logger = getLogger({ module: '@services/getParts' })

export type UploadedFile = {
  fieldName: string
  bucketName: string
  objectName: string
  stream: Readable & { truncated?: boolean }
  info: FileInfo
  s3Info: UploadedObjectInfo
}

export type FormParts = {
  fields: Record<string, string>
  files: UploadedFile[]
}

export default async function getParts(bb: Busboy) {
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

export async function cleanUpFiles(files: UploadedFile[]) {
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

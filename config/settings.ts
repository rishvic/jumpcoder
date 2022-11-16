/* config/settings.ts -- deployment-specific configuration settings.
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

import type * as argon2 from 'argon2'
import { getEnv, getEnvMinIO } from '@utils/environ'
import { argon2id } from 'argon2'

export const LOGLEVEL = getEnv('LOGLEVEL', 'info')

export const MONGO_URL = getEnv('MONGO_URL')

export const MAX_FILE_SIZE = 65535
export const S3_CODE_BUCKET = 'jumpcode'
export const MINIO_SETTINGS = getEnvMinIO('MINIO_URL')

export const ARGON2_SETTINGS: argon2.Options = {
  type: argon2id,
  version: 0x13,
  timeCost: 1,
  parallelism: 4,
  memoryCost: 2 ** 21,
  saltLength: 16,
  hashLength: 32,
}

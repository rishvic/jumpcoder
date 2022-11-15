/* utils/environ.ts -- utilities to get configuration options from environment.
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

import type { ClientOptions } from 'minio'
import { quote } from 'shell-quote'

const BOOLEAN_TRUE_STRINGS = ['true', 'on', 'ok', 'y', 'yes', '1']

export function getEnvCast<T>(key: string, cast: (val: string) => T, def?: T) {
  const val = process.env[key]
  if (val !== undefined) return cast(val)
  if (def !== undefined) return def
  throw new Error(`Set the ${key} environment variable`)
}

export function getEnv(key: string, def?: string) {
  return getEnvCast(
    key,
    function (val: string) {
      return val
    },
    def
  )
}

export function getEnvNumber(key: string, def?: number) {
  return getEnvCast(key, normalizeNumber, def)
}

export function getEnvBool(key: string, def?: boolean) {
  return getEnvCast(key, normalizeBool, def)
}

export function getEnvMinIO(key: string, def?: ClientOptions) {
  return getEnvCast(key, normalizeMinIO, def)
}

function normalizeNumber(val: string) {
  const num = Number.parseInt(val)
  if (Number.isNaN(num)) throw new Error(`Invalid number: ${quote([val])}`)
  return num
}

function normalizeBool(val: string) {
  const num = Number.parseInt(val)
  if (!Number.isNaN(num)) return num != 0
  return BOOLEAN_TRUE_STRINGS.includes(val.toLowerCase())
}

function normalizeMinIO(val: string) {
  const url = new URL(val)

  if (!url.hostname) throw new Error('End point not set in URL')
  if (!url.username) throw new Error('Access key not set in URL')
  if (!url.password) throw new Error('Secret key not set in URL')

  let options: ClientOptions = {
    endPoint: url.hostname,
    accessKey: url.username,
    secretKey: url.password,
    useSSL: url.protocol === 'https:',
  }

  if (url.port) options.port = normalizeNumber(url.port)

  return options
}

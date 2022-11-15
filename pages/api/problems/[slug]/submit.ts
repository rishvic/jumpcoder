/* api/problems/[slug]/submit.ts -- endpoint to submit solution to problems.
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

import type { NextApiHandler, PageConfig } from 'next'
import { submitProblem } from '@controllers/problems'

export const config: PageConfig = {
  api: {
    bodyParser: false,
  },
}

const handler: NextApiHandler = async function handler(req, res) {
  switch (req.method) {
    case 'POST':
      await submitProblem(req, res)
      return

    default:
      res
        .status(405)
        .setHeader('Allow', ['POST'])
        .setHeader('Content-Type', 'text/plain')
        .send('Method Not Allowed')
      return
  }
}

export default handler

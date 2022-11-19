/* pages/index.tsx -- JumpCoder landing page.
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

import Head from 'next/head'
import Container from 'react-bootstrap/Container'
import styles from '@styles/Home.module.css'

export default function Home() {
  return (
    <>
      <Head>
        <title>JumpCoder | Competitive Programming Platform</title>
        <meta name="description" content="A competitive programming platform" />
      </Head>

      <Container as="main" className={styles.main}>
        <h1 className="display-2">Welcome to JumpCoder!</h1>
      </Container>
    </>
  )
}

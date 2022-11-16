# JumpCoder

[![GitHub](https://img.shields.io/github/license/rishvic/jumpcoder)](COPYING)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

Web server written with [Next.js](https://nextjs.org/), for the JumpCoder
competitive programming platform.

## Getting Started

### Development Server

First, run the development server:

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the
result.

### Production Server

To run the production server, run the following commands:

```bash
# 1. Build the Next.js production build
yarn build
# 2. Then, run the production build
yarn start
```

Before deploying in production, make sure to set `NODE_ENV=production`.

---

Licensed under the [GNU Affero General Public License v3.0 or later](https://www.gnu.org/licenses/agpl.html).

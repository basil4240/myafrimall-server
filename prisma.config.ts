/* eslint-disable @typescript-eslint/no-unsafe-call */
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});

import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  out: './drizzle',
  schema: [
    './src/server/lib/db/schema',
    './src/modules/*/server/lib/db/schemas'
  ],
  dialect: 'postgresql',
  verbose: true,
	strict: true,
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    table: 'drizzle_migrations',
    schema: 'public',
    prefix: 'timestamp'
  },
});
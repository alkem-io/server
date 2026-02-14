import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/**/*.schema.ts',
  out: './drizzle',
  dbCredentials: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    user: process.env.DATABASE_USERNAME ?? 'synapse',
    password: process.env.DATABASE_PASSWORD ?? 'synapse',
    database: process.env.DATABASE_NAME ?? 'alkemio',
  },
});

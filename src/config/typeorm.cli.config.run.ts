import dotenv from 'dotenv';
import { join } from 'path';
import { DataSourceOptions } from 'typeorm';

dotenv.config();

// __dirname-relative (not CWD-relative) so this identical config resolves
// migrations correctly under both execution modes:
//  - ts-node from sources:  src/config/typeorm.cli.config.run.ts -> src/migrations/*.ts
//  - compiled (distroless): dist/config/typeorm.cli.config.run.js -> dist/migrations/*.js
// A CWD-relative glob would silently match zero files when run from a
// distroless image's WORKDIR with a compiled dist/ tree (see spec 026 edge case
// "Migration glob duality").
const commonConfig = {
  cache: true,
  synchronize: false,
  logger: 'advanced-console' as const,
  logging: process.env.ENABLE_ORM_LOGGING === 'true',
  migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
  migrationsTableName: 'migrations_typeorm',
  migrationsRun: true,
};

export const typeormCliConfig: DataSourceOptions = {
  ...commonConfig,
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : 5432,
  username: process.env.DATABASE_USERNAME ?? 'synapse',
  password: process.env.DATABASE_PASSWORD ?? 'synapse',
  database: process.env.DATABASE_NAME ?? 'alkemio',
};

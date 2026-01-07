import { join } from 'path';
import dotenv from 'dotenv';
import { DataSourceOptions } from 'typeorm';

dotenv.config();

const commonConfig = {
  cache: true,
  synchronize: false,
  logger: 'advanced-console' as const,
  logging: process.env.ENABLE_ORM_LOGGING === 'true',
  entities: [
    join('src', 'domain', '**', '*.entity.{ts,js}'),
    join('src', 'library', '**', '*.entity.{ts,js}'),
    join('src', 'platform', '**', '*.entity.{ts,js}'),
    join('src', 'services', '**', '*.entity.{ts,js}'),
  ],
  migrations: [join('src', 'migrations', '*.{ts,js}')],
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

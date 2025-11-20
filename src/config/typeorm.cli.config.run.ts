import { join } from 'path';
import dotenv from 'dotenv';
import { DataSourceOptions } from 'typeorm';

dotenv.config();

// Support both MySQL (legacy) and Postgres databases
const dbType = (process.env.DATABASE_TYPE as 'mysql' | 'postgres') ?? 'postgres';

const commonConfig = {
  cache: true,
  synchronize: false,
  logger: 'advanced-console' as const,
  logging: process.env.ENABLE_ORM_LOGGING === 'true',
  migrations: [join('src', 'migrations', '*.{ts,js}')],
  migrationsTableName: 'migrations_typeorm',
  migrationsRun: true,
};

export const typeormCliConfig: DataSourceOptions =
  dbType === 'postgres'
    ? {
        ...commonConfig,
        type: 'postgres',
        host: process.env.DATABASE_HOST ?? 'localhost',
        port: process.env.POSTGRES_DB_PORT
          ? Number(process.env.POSTGRES_DB_PORT)
          : 5432,
        username: process.env.POSTGRES_USER ?? 'alkemio',
        password: process.env.POSTGRES_PASSWORD ?? 'alkemio',
        database: process.env.POSTGRES_DATABASE ?? 'alkemio',
      }
    : {
        ...commonConfig,
        type: 'mysql',
        host: process.env.DATABASE_HOST ?? 'localhost',
        port: process.env.MYSQL_DB_PORT
          ? Number(process.env.MYSQL_DB_PORT)
          : 3306,
        charset: process.env.MYSQL_CHARSET ?? 'utf8mb4',
        username: 'root',
        password: process.env.MYSQL_ROOT_PASSWORD ?? 'toor',
        database: process.env.MYSQL_DATABASE ?? 'alkemio',
        insecureAuth: true,
      };

import { ConnectionOptions } from 'typeorm';
import { join } from 'path';

export const typeormCliConfig: ConnectionOptions = {
  type: 'mysql',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: process.env.MYSQL_DB_PORT ? Number(process.env.MYSQL_DB_PORT) : 3306,
  charset: process.env.MYSQL_CHARSET ?? 'utf8mb4',
  cache: true,
  username: 'root',
  password: process.env.MYSQL_ROOT_PASSWORD ?? 'toor',
  database: process.env.MYSQL_DATABASE ?? 'alkemio',
  insecureAuth: true,
  synchronize: false,
  logger: 'advanced-console',
  logging: process.env.ENABLE_ORM_LOGGING === 'true',
  entities: [join('src', 'domain', '**', '*.entity.{ts,js}')],
  migrations: [join('src', 'migrations', '*.{ts,js}')],
  migrationsTableName: 'migrations_typeorm',
  migrationsRun: true,
  cli: {
    migrationsDir: 'src/migrations',
  },
};

module.exports = typeormCliConfig;

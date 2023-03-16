import { join } from 'path';
import dotenv from 'dotenv';
import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';

dotenv.config();

export const typeormCliConfig: MysqlConnectionOptions = {
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
  migrations: [join('src', 'migrations', '*.{ts,js}')],
  migrationsTableName: 'migrations_typeorm',
  migrationsRun: true,
};

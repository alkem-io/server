import { registerAs } from '@nestjs/config/dist/utils/register-as.util';

export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST,
  port: process.env.MYSQL_DB_PORT ? Number(process.env.MYSQL_DB_PORT) : 3306,
  password: process.env.MYSQL_ROOT_PASSWORD,
  schema: process.env.MYSQL_DATABASE,
  logging: process.env.ENABLE_ORM_LOGGING === 'true',
}));

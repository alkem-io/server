import { registerAs } from '@nestjs/config/dist/utils/register-as.util';
import { join } from 'path';

export default registerAs('database', () => ({
  type: 'mysql',
  host: process.env.DATABASE_HOST,
  port: process.env.MYSQL_DB_PORT ? Number(process.env.MYSQL_DB_PORT) : 3306,
  cache: true,
  username: 'root',
  password: process.env.MYSQL_ROOT_PASSWORD,
  schema: process.env.MYSQL_DATABASE,
  insecureAuth: true,
  synchronize: true,
  logging: process.env.ENABLE_ORM_LOGGING === 'true',
  entities: [join(__dirname, '**', '*.entity.{ts,js}')],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  migrationsTableName: 'migrations_typeorm',
  migrationsRun: true,
  cli: {
    migrationsDir: 'src/migrations',
  },
}));

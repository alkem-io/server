import { registerAs } from "@nestjs/config/dist/utils/register-as.util";

export default registerAs('database', () => ({
    type: 'mysql',
    host: process.env.DATABASE_HOST,
    port: process.env.MYSQL_DB_PORT ? Number(process.env.MYSQL_DB_PORT) : 3306,
    cache: true,
    username: 'root',
    password: process.env.MYSQL_ROOT_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    insecureAuth: true,
    synchronize: true,
    logging: process.env.ENABLE_ORM_LOGGING === 'true',
    entities: ['dist/**/*.entity.js']
  }));
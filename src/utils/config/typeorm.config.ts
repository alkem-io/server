import { join } from 'path';
import { ConnectionOptions } from 'typeorm';

// You can load you .env file here synchronously using dotenv package (not installed here),
// import * as dotenv from 'dotenv';
// import * as fs from 'fs';
// const environment = process.env.NODE_ENV || 'development';
// const data: any = dotenv.parse(fs.readFileSync(`${environment}.env`));
// You can also make a singleton service that load and expose the .env file content.
// ...

// Check typeORM documentation for more information.
const config: ConnectionOptions = {
  type: 'mysql',
  // host: process.env.DATABASE_HOST || 'localhost',
  host: 'localhost',
  port: 3306,
  cache: true,
  username: 'root',
  password: 'toor',
  database: 'cherrytwist',
  insecureAuth: true,
  synchronize: false,
  entities: [join(__dirname, '**', '*.entity.{ts,js}')],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  logging: true,
  logger: 'file',
  migrationsTableName: 'migrations_typeorm',
  migrationsRun: true,
  cli: {
    migrationsDir: 'src/migrations',
  },
};

module.exports = config;

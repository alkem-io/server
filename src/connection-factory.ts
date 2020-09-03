import { createConnection } from 'typeorm';

export class ConnectionFactory {
  public GetConnection() {
    return createConnection(
      {
        "type": "mysql",
        "host": process.env.DATABASE_HOST,
        "port": 3306,
        "username": "root",
        "password": process.env.MYSQL_ROOT_PASSWORD,
        "database": process.env.MYSQL_DATABASE,
        "insecureAuth": true,
        "synchronize": true,
        // "logging": true,
        "entities": [
          "./src/models/index.ts"
        ],
        "migrations": [
          "src/migrations/**/*.ts"
        ]
      }
    );
  }
}
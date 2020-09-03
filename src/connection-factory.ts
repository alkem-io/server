import { createConnection } from 'typeorm';

export class ConnectionFactory {
    public GetConnection() {

        const dbPort = process.env.MYSQL_DB_PORT ? Number(process.env.MYSQL_DB_PORT) : 3306;
        return createConnection(
            {
                "type": "mysql",
                "host": process.env.DATABASE_HOST,
                "port": dbPort,
                "username": "root",
                "password": process.env.MYSQL_ROOT_PASSWORD,
                "database": process.env.MYSQL_DATABASE,
                "insecureAuth": true,
                "synchronize": true,
                "logging": process.env.ENABLE_ORM_LOGGING === 'true',
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
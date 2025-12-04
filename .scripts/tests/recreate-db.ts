
import loadConfig from '../../src/config/configuration';
import { createConnection } from 'mysql2';

const config = loadConfig();

const connection = createConnection({
  host: config.storage.database.host,
  user: config.storage.database.username,
  password: config.storage.database.password,
  charset: config.storage.database.charset,
  port: 3306,
  database: config.storage.database.schema,
  multipleStatements: true
});


connection.connect();

connection.query(`DROP DATABASE IF EXISTS \`${config.storage.database.schema}\`; CREATE DATABASE \`${config.storage.database.schema}\`;`, (err) => {
  if (err) {
    console.error('Error recreating database:', err);
    process.exit(1);
  } else {
    console.log(`Database ${config.storage.database.schema} has been recreated.`);
    process.exit(0);
  }
});

connection.end();
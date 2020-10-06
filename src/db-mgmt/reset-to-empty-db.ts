import { Connection } from 'typeorm';
import { LoadConfiguration } from '../configuration-loader';
import { ConnectionFactory } from '../connection-factory';

export async function connect_to_database(): Promise<Connection> {
  LoadConfiguration();

  console.log('Database: connecting... ');
  const connectionFactory = new ConnectionFactory();
  const connection = await connectionFactory.GetConnection();
  console.log('....connected');
  return connection;
}

export async function drop_db(connection: Connection) {
  console.log('Dropping existing database... ');
  await connection.dropDatabase();
  await connection.synchronize();
  console.log('.....dropped.');
}

async function reset_to_empty_db() {
  const connection = await connect_to_database();
  await drop_db(connection);
}

reset_to_empty_db()
  .then(() => {
    process.exit();
  })
  .catch(function (e: Error) {
    console.error(e.message);
    process.exit(1);
  });

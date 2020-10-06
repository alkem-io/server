import { Ecoverse } from '../models';
import { LoadConfiguration } from '../configuration-loader';
import { ConnectionFactory } from '../connection-factory';

async function reset_to_empty_ecoverse() {
  LoadConfiguration();

  console.log('Database: connecting... ');
  const connectionFactory = new ConnectionFactory();
  const connection = await connectionFactory.GetConnection();
  console.log('....connected');

  console.log('Dropping existing database... ');
  await connection.dropDatabase();
  await connection.synchronize();
  console.log('.....dropped.');

  // Create new Ecoverse
  console.log('Populating empty ecoverse... ');
  const ctverse = new Ecoverse();
  ctverse.initialiseMembers();
  Ecoverse.populateEmptyEcoverse(ctverse);

  await connection.manager.save(ctverse);
  await ctverse.save();
  console.log('.....populated.');
}

reset_to_empty_ecoverse()
  .then(() => {
    process.exit();
  })
  .catch(function (e: Error) {
    console.error(e.message);
    process.exit(1);
  });

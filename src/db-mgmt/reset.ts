import { Connection } from 'typeorm';
import { LoadConfiguration } from '../configuration-loader';
import { ConnectionFactory } from '../connection-factory';
import { Challenge, Context, Ecoverse, Reference, Tag, User, UserGroup } from '../models';

async function reset_db() {

  LoadConfiguration();

  console.log('Database: Starting the reset of the database... ');
  const connectionFactory = new ConnectionFactory();
  const connection = await connectionFactory.GetConnection();

  await connection.dropDatabase();
  await connection.synchronize();

  console.log('Database: dropped... ');

  await load_sample_data(connection);
};

/* Load in sample data into a synchronized database connection */
async function load_sample_data(connection: Connection) {
  console.log('Database: Loading sample data... ');

  // Create new Ecoverse
  const ctverse = new Ecoverse('CherryTwist dogfood');

  // Tags
  const java = new Tag('Java');
  const graphql = new Tag('GraphQL');
  const nature = new Tag('Nature');
  const industry = new Tag('Industry');
  ctverse.tags = [java, graphql, industry, nature];

  // Users
  const john = new User("john");
  const bob = new User("bob");
  bob.tags = [java, graphql];

  // User Groups
  const jedi = new UserGroup("Jedi");
  jedi.members = [john, bob];
  jedi.focalPoint = john;
  const crew = new UserGroup("Crew");
  ctverse.groups = [jedi, crew];

  // Context
  ctverse.context = new Context();
  ctverse.context.description = "A sample ecoverse to play with";
  
  // Challenges
  const energyWeb = new Challenge('Energy Web');
  energyWeb.tags = [java, graphql, industry];
  energyWeb.context = new Context();
  energyWeb.context.description = "Balance the grid in a decentralised world";
  const ref1 = new Reference("video", "http://localhost:8443/myVid", "Video explainer for the challenge");
  const ref2 = new Reference("EnergyWeb", "https://www.energyweb.org/", "Official site");
  energyWeb.context.references = [ref1, ref2];

  const cleanOceans = new Challenge('Clean Oceans');
  cleanOceans.tags = [graphql, nature];
  cleanOceans.context = new Context();
  cleanOceans.context.description = "Keep our Oceans clean and in balance!";

  const cargoInsurance = new Challenge('Cargo Insurance');
  cargoInsurance.tags = [graphql, java, industry];
  cargoInsurance.context = new Context();
  cargoInsurance.context.description = "In an interconnected world, how to manage risk along the chain?";

  ctverse.challenges = [cleanOceans, energyWeb, cargoInsurance];
  await connection.manager.save(ctverse);

};

reset_db().then(() => {
  console.log('Database: reset complete...');
  process.exit();
}).catch(function (e: Error) {
  console.error(e.message);
  process.exit(1);
});

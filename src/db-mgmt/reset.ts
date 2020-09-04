import { createConnection, Connection } from 'typeorm';
import { Ecoverse, User, Challenge, Tag, UserGroup, Context, Reference } from '../models';
import { ConnectionFactory } from '../connection-factory';
import { ConfigurationValidator } from 'src/validators/configuration';


async function reset_db() {

  require('dotenv').config()

  const configurationValidator = new ConfigurationValidator();
  configurationValidator.validate();

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
  const ctverse = new Ecoverse("CherryTwist dogfood");

  // Tags
  const java = new Tag('Java');
  await java.save();
  const graphql = new Tag('GraphQL');
  await graphql.save();
  const nature = new Tag('Nature');
  await nature.save();
  const industry = new Tag('Industry');
  await industry.save();
  ctverse.tags = [java, graphql, industry, nature];

  // Users
  const john = new User("john");
  const bob = new User("bob");
  await bob.save();
  ctverse.members = [john, bob];

  // User Groups
  const jedi = new UserGroup("Jedi");
  await jedi.save();
  jedi.members = [john, bob];
  const crew = new UserGroup("Crew");
  await crew.save();
  ctverse.groups = [jedi, crew];

  ctverse.context = new Context();
  ctverse.context.description = "A sample ecoverse to play with";
  await ctverse.save();

  // Challenges
  const energyWeb = new Challenge('Energy Web');
  energyWeb.tags = [java, graphql, industry];
  energyWeb.context = new Context();
  energyWeb.context.description = "Balance the grid in a decentralised world";
  const ref1 = new Reference("video", "http://localhost:8443/myVid", "Video explainer for the challenge");
  const ref2 = new Reference("EnergyWeb", "https://www.energyweb.org/", "Official site");
  energyWeb.context.references = [ref1, ref2];
  await energyWeb.save();

  const cleanOceans = new Challenge('Clean Oceans');
  cleanOceans.tags = [graphql, nature];
  cleanOceans.context = new Context();
  cleanOceans.context.description = "Keep our Oceans clean and in balance!";
  await cleanOceans.save();

  const cargoInsurance = new Challenge('Cargo Insurance');
  cargoInsurance.tags = [graphql, java, industry];
  cargoInsurance.context = new Context();
  cargoInsurance.context.description = "In an interconnected world, how to manage risk along the chain?";
  await cargoInsurance.save();

  ctverse.challenges = [cleanOceans, energyWeb, cargoInsurance];
  await ctverse.save();

  // Add in the challenge
  //await populate_sample_challenge2(connection);

  const initialEcoverse = JSON.stringify(ctverse, null, 4);
  //console.log(initialEcoverse);

};

reset_db().then(() => {
  console.log('Database: reset complete...');
  process.exit();
}).catch(function (e) {
  throw e;
});

import { createConnection } from 'typeorm';
import { Ecoverse, User, Challenge, Tag, UserGroup, Context } from '../models';


async function reset_db() {
  console.log('Database: Starting the reset of the database... ');
  const connection = await createConnection();
  
  await connection.dropDatabase();
  await connection.synchronize();

  console.log('Database: dropped... ');

  // Create new Ecoverse
  const ctverse = new Ecoverse("CherryTwist dogfood");

  // Tags
  const java = new Tag('Java');
  const graphql = new Tag('GraphQL');
  ctverse.tags = [java, graphql];
  

  // User Groups
  const jedi = new UserGroup("Jedi");
  const crew = new UserGroup("Crew");
  ctverse.groups = [jedi, crew];

  // Challenges
  const energyWeb = new Challenge('Energy Web');
  energyWeb.tags = new Array(java);
  energyWeb.context = new Context();
  energyWeb.context.description = "Balance the grid in a decentralised world";

  const cleanOceans = new Challenge('Clean Oceans');
  cleanOceans.tags = new Array(graphql);
  cleanOceans.context = new Context();
  cleanOceans.context.description = "Keep our Oceans clean and in balance!";

  const cargoInsurance = new Challenge('Cargo Insurance');
  cargoInsurance.tags = new Array(graphql, java);
  cargoInsurance.context = new Context();
  cargoInsurance.context.description = "In an interconnected world, how to manage risk along the chain?";

  ctverse.challenges = [cleanOceans, energyWeb, cargoInsurance];

  // Users
  const john = new User("john");
  const bob = new User("bob");
  ctverse.members = [john, bob];

  await ctverse.save();

};

reset_db().then(()=>{
  console.log('Database: reset complete...');
  process.exit();
}).catch(function(e){
  throw e;
});

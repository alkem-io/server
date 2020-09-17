import { Connection } from 'typeorm';
import { LoadConfiguration } from '../configuration-loader';
import { ConnectionFactory } from '../connection-factory';
import { Challenge, Context, Ecoverse, Reference, Tag, User, UserGroup, Organisation } from '../models';
import  fs  from 'fs';


async function reset_db() {

  LoadConfiguration();

  console.log('Database: Starting the reset of the database... ');
  const connectionFactory = new ConnectionFactory();
  const connection = await connectionFactory.GetConnection();

  await connection.dropDatabase();
  await connection.synchronize();

  console.log('Database: dropped... ');

  await load_sample_data(connection);
}

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
  const john = new User('john');
  const bob = new User('bob');
  const valentin = new User('Valentin');
  const angel = new User('Angel');
  const rene = new User('Rene');
  const rutger = new User('Rutger');
  const alex = new User('Alex');
  const neil = new User('Neil');
  bob.tags = [java, graphql];

  // User Groups
  const members = new UserGroup('members');
  members.members = [angel, valentin];
  members.focalPoint = angel;
  const jedi = new UserGroup('Jedi');
  jedi.members = [john, bob];
  jedi.focalPoint = john;
  const crew = new UserGroup('Crew');
  ctverse.groups = [jedi, crew, members];

  // Context
  ctverse.context = new Context();
  ctverse.context.tagline = 'A sample ecoverse to play with';

  // Challenges
  const energyWeb = new Challenge('Energy Web');
  energyWeb.tags = [java, graphql, industry];
  energyWeb.context = new Context();
  energyWeb.context.tagline = 'Web of energy';
  const ref1 = new Reference('video', 'http://localhost:8443/myVid', 'Video explainer for the challenge');
  const ref2 = new Reference('EnergyWeb', 'https://www.energyweb.org/', 'Official site');
  const energyWebMembers = new UserGroup('members');
  energyWebMembers.members = [angel, valentin, neil];
  energyWebMembers.focalPoint = neil;
  energyWeb.groups = [jedi, energyWebMembers];
  energyWeb.context.references = [ref1, ref2];

  const cleanOceans = new Challenge('Clean Oceans');
  cleanOceans.tags = [graphql, nature];
  cleanOceans.context = new Context();
  cleanOceans.context.tagline = 'Keep our Oceans clean and in balance!';
  const cleanOceanMembers = new UserGroup('members2');
  cleanOceanMembers.members = [angel, valentin, neil];
  cleanOceanMembers.focalPoint = neil;
  cleanOceans.groups = [crew, cleanOceanMembers];

  const cargoInsurance = new Challenge('Cargo Insurance');
  cargoInsurance.tags = [graphql, java, industry];
  cargoInsurance.context = new Context();
  cargoInsurance.context.tagline = 'In an interconnected world, how to manage risk along the chain?';
  const cargoInsuranceMembers = new UserGroup('members3');
  cargoInsuranceMembers.members = [rutger, rene, alex];
  cargoInsuranceMembers.focalPoint = rene;
  cargoInsurance.groups = [crew, cargoInsuranceMembers];


  // Load in a full challenge from a json file
  const rawdata = fs.readFileSync('./src/db-mgmt/challenge-balance-the-grid.json');
  const balanceGrid = JSON.parse(String(rawdata));

  //const balanceGridStr = JSON.stringify(balanceGrid, null, 4);
  //console.log(`Generated challenge ${balanceGridStr}`);

  //Organisations
  ctverse.save();
  const host = new Organisation('Odyssey');
  host.members = [angel, valentin, rutger, neil, rene, alex];
  host.save();
  ctverse.ecoverseHost = host;

  ctverse.challenges = [cleanOceans, energyWeb, cargoInsurance, balanceGrid];
  await connection.manager.save(ctverse);

}


reset_db().then(() => {
  console.log('Database: reset complete...');
  process.exit();
}).catch(function (e: Error) {
  console.error(e.message);
  process.exit(1);
});


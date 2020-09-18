import { Challenge, Context, Ecoverse, Reference, Tag, User, UserGroup, Organisation } from '../models';
import { LoadConfiguration } from '../configuration-loader';
import { ConnectionFactory } from '../connection-factory';

/* Load in sample data  */
async function load_sample_data() {
  console.log('=== Ecoverse: Loading sample data ===');

  LoadConfiguration();

  console.log('Database: connecting... ');
  const connectionFactory = new ConnectionFactory();
  const connection = await connectionFactory.GetConnection();
  console.log('....connected');

  console.log('Loading sample data....');
  // Populate the Ecoverse beyond the defaults
  const ctverse = await Ecoverse.getInstance();
  ctverse.name = 'Cherrytwist dogfood';
  ctverse.context.tagline = 'Powering multi-stakeholder collaboration!';

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
  const members = UserGroup.getGroupByName(ctverse, 'members');
  members.members = [angel, valentin];
  members.focalPoint = angel;
  const jedi = UserGroup.addGroupWithName(ctverse, 'Jedi');
  jedi.members = [john, bob];
  jedi.focalPoint = john;
  const crew = UserGroup.addGroupWithName(ctverse, 'Crew');
  ctverse.groups = [jedi, crew, members];


  // Challenges
  const energyWeb = new Challenge('Energy Web');
  energyWeb.initialiseMembers();
  energyWeb.tags = [java, graphql, industry];
  energyWeb.context = new Context();
  energyWeb.context.tagline = 'Web of energy';
  const ref1 = new Reference('video', 'http://localhost:8443/myVid', 'Video explainer for the challenge');
  const ref2 = new Reference('EnergyWeb', 'https://www.energyweb.org/', 'Official site');
  const energyWebMembers = UserGroup.getGroupByName(ctverse, 'members');
  energyWebMembers.members = [angel, valentin, neil];
  energyWebMembers.focalPoint = neil;
  energyWeb.groups = [energyWebMembers];
  energyWeb.context.references = [ref1, ref2];

  const cleanOceans = new Challenge('Clean Oceans');
  cleanOceans.initialiseMembers();
  cleanOceans.tags = [graphql, nature];
  cleanOceans.context = new Context();
  cleanOceans.context.tagline = 'Keep our Oceans clean and in balance!';
  const cleanOceanMembers = UserGroup.getGroupByName(ctverse, 'members');
  cleanOceanMembers.members = [angel, valentin, neil];
  cleanOceanMembers.focalPoint = neil;
  cleanOceans.groups = [crew, cleanOceanMembers];

  const cargoInsurance = new Challenge('Cargo Insurance');
  cargoInsurance.initialiseMembers();
  cargoInsurance.tags = [graphql, java, industry];
  cargoInsurance.context = new Context();
  cargoInsurance.context.tagline = 'In an interconnected world, how to manage risk along the chain?';
  const cargoInsuranceMembers = UserGroup.getGroupByName(ctverse, 'members');
  cargoInsuranceMembers.members = [rutger, rene, alex];
  cargoInsuranceMembers.focalPoint = rene;
  cargoInsurance.groups = [cargoInsuranceMembers];

  ctverse.challenges = [cleanOceans, energyWeb, cargoInsurance];
  // Load in a full challenge from a json file
  //const rawdata = fs.readFileSync('./src/db-mgmt/challenge-balance-the-grid.json');
  //const balanceGrid = JSON.parse(String(rawdata));

  //const balanceGridStr = JSON.stringify(balanceGrid, null, 4);
  //console.log(`Generated challenge ${balanceGridStr}`);

  //Organisations
  await ctverse.save();


  await connection.manager.save(ctverse);

}


load_sample_data().then(() => {
  console.log('....sample data loaded');
  process.exit();
}).catch(function (e: Error) {
  console.error(e.message);
  process.exit(1);
});


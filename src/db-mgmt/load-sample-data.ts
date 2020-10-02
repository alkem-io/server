import { Challenge, Context, Ecoverse, Reference, Tagset, User, UserGroup } from '../models';
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
  let ctverse = await Ecoverse.findOne();
  if (!ctverse) {
    // No ecoverse, create one
    console.log('...no ecoverse found, creating default ecoverse...');
    ctverse = new Ecoverse();
    ctverse.initialiseMembers();
    Ecoverse.populateEmptyEcoverse(ctverse);
  }

  ctverse.name = 'Cherrytwist dogfood';
  ctverse.context.tagline = 'Powering multi-stakeholder collaboration!';

  // Tags
   ctverse.tagset.tags = ['Java', 'GraphQL', 'Nature', 'Industry'];

  // Users
  const john = new User('john');
  john.initialiseMembers();
  const bob = new User('bob');
  bob.initialiseMembers()
  bob.email = 'admin@cherrytwist.org';
  const valentin = new User('Valentin');
  valentin.initialiseMembers()
  valentin.email = 'valentin_yanakiev@yahoo.co.uk';
  const angel = new User('Angel');
  angel.initialiseMembers
  angel.email = 'angel@cmd.bg';
  const neil = new User('Neil');
  neil.initialiseMembers();
  neil.email = 'neil@cherrytwist.org';
  const defaultTagset = Tagset.defaultTagset(bob);
  defaultTagset.addTag('java');
  defaultTagset.addTag('graphql');

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
  if (!energyWeb.tagset) throw new Error('cannot reach this');
  energyWeb.tagset.addTag('java');
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
  if (!cleanOceans.tagset) throw new Error('cannot reach this');
  cleanOceans.tagset.addTag('Nature');
  cleanOceans.tagset.addTag('Test');
  cleanOceans.context = new Context();
  cleanOceans.context.tagline = 'Keep our Oceans clean and in balance!';
  const cleanOceanMembers = UserGroup.getGroupByName(ctverse, 'members');
  cleanOceanMembers.members = [angel, valentin, neil];
  cleanOceanMembers.focalPoint = neil;
  cleanOceans.groups = [crew, cleanOceanMembers];

  const cargoInsurance = new Challenge('Cargo Insurance');
  cargoInsurance.initialiseMembers();
  if (!cargoInsurance.tagset) throw new Error('cannot reach this');
  cargoInsurance.tagset.addTag('Logistics');
  cargoInsurance.context = new Context();
  cargoInsurance.context.tagline = 'In an interconnected world, how to manage risk along the chain?';
  const cargoInsuranceMembers = UserGroup.getGroupByName(ctverse, 'members');
  cargoInsuranceMembers.members = [angel, valentin, neil];
  cargoInsuranceMembers.focalPoint = angel;
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

load_sample_data()
  .then(() => {
    console.log('....sample data loaded');
    process.exit();
  })
  .catch(function (e: Error) {
    console.error(e.message);
    process.exit(1);
  });

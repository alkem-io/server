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
  bob.tags = [java, graphql];

  // User Groups
  const jedi = new UserGroup('Jedi');
  jedi.members = [john, bob];
  jedi.focalPoint = john;
  const crew = new UserGroup('Crew');
  ctverse.groups = [jedi, crew];

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
  energyWeb.context.references = [ref1, ref2];

  const cleanOceans = new Challenge('Clean Oceans');
  cleanOceans.tags = [graphql, nature];
  cleanOceans.context = new Context();
  cleanOceans.context.tagline = 'Keep our Oceans clean and in balance!';

  const cargoInsurance = new Challenge('Cargo Insurance');
  cargoInsurance.tags = [graphql, java, industry];
  cargoInsurance.context = new Context();
  cargoInsurance.context.tagline = 'In an interconnected world, how to manage risk along the chain?';

  const balanceGrid = create_sample_challenge();
  balanceGrid.tags = [java, industry];
  const balanceGridStr = JSON.stringify(balanceGrid, null, 4);
  console.log(`Generated challenge ${balanceGridStr}`);

  ctverse.challenges = [cleanOceans, energyWeb, cargoInsurance, balanceGrid];
  await connection.manager.save(ctverse);

}

function create_sample_challenge(): Challenge {
    const challenge = new Challenge('Balance the grid');
    challenge.context = new Context();

    challenge.context.tagline = 'How might we incentivize consumers to communicate energy demand and production to allow all stakeholders to balance the grid?';
    challenge.context.vision = 'Enable the entire energy sector to transition from an ego-system to an eco-system, where everyone and anything is incentivized to share demand AND production of green power. You will co-create the fast and energy efficient digital power market commons by developing a protocol communication layer to power an awesome fossil-free future within one generation.';
    challenge.context.who = 'Vattenfall is inviting energy specialists throughout the entire sector, from DSOs and TSOs to solar power solution providers, to work with the teams to create the best solutions';
    challenge.context.background = 'Our power system is becoming increasingly more decentralized and complex. ' + 'By using solar PV, consumers have become electricity producers as well, and the number of these ‘prosumers’ is increasing. ' +
                                    'All the while, the electricity demand is rising due to the electrification of transport and industry. ' +
                                    'Cities around the world are electrifying their public transport systems, but if all busses would be charged around the time people are in the kitchen preparing dinner, the current grid would not be able to cope. ' +
                                    'The energy sector is striving to make the best of these developments, but so far the sector remains fragmented with a large number of initiatives and pilots spread over start-ups, scale-ups, countries, DSOs, TSOs, ' +
                                    'utilities, and regulators. Balancing the power grid is and will be more and more difficult and expensive. While technological advances have already disrupted many areas of the power system and, for example, empowered consumers to become producers and traders of their own electricity, ' +
                                    'the balancing markets still resemble an exclusive club of the big industry players. How can we enable also small consumers and prosumers to contribute to balancing? ';

    challenge.context.impact = 'The power grid is one of the most sophisticated infrastructures ever built. By building the energy flexibility ecosystem on a digital protocol layer, ' +
                                'the network will become fit for a fossil-free future and will prevent major and costly physical grid investments that will impact the grid and its customers. ' +
                                'It will make the power system more robust and transparent, enabling anyone to build an infinite amount of business cases on top of your solution.';

    const ref1 = new Reference('video', 'https://youtu.be/-wGlzcjs9CI', 'Video explainer for the challenge');
    const ref2 = new Reference('visual', 'https://www.odyssey.org/wp-content/uploads/2020/08/1.-Fossil-Fuel-Free-Future-Vattenfall1-72-scaled.jpg', 'Visual for the challenge');
    const ref3 = new Reference('EnergyWeb2', 'https://www.energyweb.org/', 'Official site');

    challenge.context.references = [ref1, ref2, ref3];

    return challenge;
}


reset_db().then(() => {
  console.log('Database: reset complete...');
  process.exit();
}).catch(function (e: Error) {
  console.error(e.message);
  process.exit(1);
});


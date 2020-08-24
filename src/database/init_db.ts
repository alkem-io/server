import { createConnection } from 'typeorm';
import { Ecoverse, User, Challenge, Tag, UserGroup } from '../models';

export const init_db = async() => {
  const connection = await createConnection();
  await connection.dropDatabase();
  await connection.synchronize();

  // Tags
  const java = new Tag('Java');
  await java.save();

  const graphql = new Tag('GraphQL');
  await graphql.save();

  // User Groups
  const ecoverseMember = new UserGroup("Shell");
  await ecoverseMember.save();
  const ecoverseMember2 = new UserGroup("BP");
  await ecoverseMember2.save();


  // Challenges
  const energyWeb = new Challenge('Energy Web');
  energyWeb.tags = new Array(java);
  await energyWeb.save();

  const cleanOceans = new Challenge('Clean Oceans');
  cleanOceans.tags = new Array(graphql);
  await cleanOceans.save();


  // Ecoverse
  const odyssey = new Ecoverse('Odyssey');
  odyssey.challenges = new Array(energyWeb);
  odyssey.members = new Array(ecoverseMember, ecoverseMember2);
  await odyssey.save();

  // Users
  const neilTest = new User("techSmyth");
  await neilTest.save();

  const valentinTest = new User("ValentinY");
  await valentinTest.save();


};
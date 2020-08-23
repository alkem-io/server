import { createConnection } from 'typeorm';
import { Ecoverse, User, Challenge, Tag } from '../models';

export const init_db = async() => {
  const connection = await createConnection();
  await connection.dropDatabase();
  await connection.synchronize();

  // Tags
  const java = new Tag();
  java.name = 'Java';
  await java.save();

  const graphql = new Tag();
  graphql.name = 'GraphQL';
  await graphql.save();


  // Challenges
  const energyWeb = new Challenge('Energy Web');
  energyWeb.tag = java;
  await energyWeb.save();

  const cleanOceans = new Challenge('Clean Oceans');
  cleanOceans.tag = graphql;
  await cleanOceans.save();


  // Ecoverse
  const odyssey = new Ecoverse();
  odyssey.challenge = energyWeb;
  await odyssey.save();

  // Users
  const neilTest = new User("techSmyth");
  await neilTest.save();

  const valentinTest = new User("ValentinY");
  await valentinTest.save();


};
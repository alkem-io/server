import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import { express as voyagerMiddleware } from 'graphql-voyager/middleware';
import 'reflect-metadata';
import { buildSchema } from 'type-graphql';
import { LoadConfiguration } from './configuration-loader';
import { ConnectionFactory } from './connection-factory';
import { CreateMutations, Resolvers, UpdateMutations } from './schema';
import { exit } from 'process';
import { Ecoverse } from './models';


const main = async () => {

  LoadConfiguration();

  // Connect to the database
  const connectionFactory = new ConnectionFactory();
  const connection = await connectionFactory.GetConnection();
  try {
    console.log('Connecting to database....');
    await connection.synchronize();
    console.log('......connection established and contents synchronized');
  } catch (error) {
    console.log('Unable to establish database connection: ' + error);
    exit();
  }

  // Check that the base data is populated with exactly one ecoverse
  try{
    const ecoverseCount = await Ecoverse.count();
    if (ecoverseCount == 0) {
      console.log('Detected empty ecoverse, populating....');

      const ecoverse = new Ecoverse();
      ecoverse.initialiseMembers();
      Ecoverse.populateEmptyEcoverse(ecoverse);

      await connection.manager.save(ecoverse);
      console.log('.....complete.');
    }
    // Get the name
    const ecoverse = await Ecoverse.getInstance();
    console.log(`Loaded ecoverse with name: ${ecoverse.name}`);
  } catch (error) {
    console.log('Unable to populate empty ecoverse: ' + error);
    exit();
  }

  // Build the schema
  console.log('Establishing GraphQL schema + endpoint....');
  const schema = await buildSchema({
    resolvers: [Resolvers, CreateMutations, UpdateMutations],
  });

  const apolloServer = new ApolloServer({ schema });
  const app = express();
  apolloServer.applyMiddleware({ app });

  const environment = process.env.NODE_ENV;
  const isDevelopment = environment === 'development';

  if (isDevelopment) {
    app.use('/voyager', voyagerMiddleware({ endpointUrl: '/graphql' }));
  }

  const GRAPHQL_ENDPOINT_PORT = process.env.GRAPHQL_ENDPOINT_PORT || 4000;

  app.listen(
    GRAPHQL_ENDPOINT_PORT,
    () => console.log(`....listening on http://localhost:${GRAPHQL_ENDPOINT_PORT}`),
  );
};

main();

import 'reflect-metadata';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import { buildSchema } from 'type-graphql';

import { Resolvers } from './schema/Resolvers';
import { createConnection } from 'typeorm';
import { Ecoverse } from './models';
import { ConnectionFactory } from './connection-factory';
import { ConfigurationValidator } from './validators/configuration';


const main = async() => {

  require('dotenv').config()

  const configurationValidator = new ConfigurationValidator();
  configurationValidator.validate();

  // Connect to the database
  try {
    const connectionFactory = new ConnectionFactory();
    const connection = await connectionFactory.GetConnection();
    await connection.synchronize();
    console.log('Database connection established and data loaded');
  } catch (error) {
    console.log('Unable to establish database connection: ' + error); 
  }

  // Build the schema
  const schema = await buildSchema({
    resolvers: [ Resolvers ],
  });

  const apolloServer = new ApolloServer({ schema });
  const app = express();
  apolloServer.applyMiddleware({ app });
  app.listen(
    4000,
    () => console.log(`Server started on http://localhost:4000${apolloServer.graphqlPath}`),
  );
};

main();
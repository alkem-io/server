import 'reflect-metadata';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import { buildSchema } from 'type-graphql';

import { Resolvers } from './schema/Resolvers';
import { createConnection } from 'typeorm';


const main = async() => {

  // Connect to the database
  try {
    const connection = await createConnection();
    await connection.synchronize();
    console.log('Database connection established.');
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
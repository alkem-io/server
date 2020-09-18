import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import { express as voyagerMiddleware } from 'graphql-voyager/middleware';
import 'reflect-metadata';
import { buildSchema } from 'type-graphql';
import { LoadConfiguration } from './configuration-loader';
import { ConnectionFactory } from './connection-factory';
import { CreateMutations, Resolvers, UpdateMutations } from './schema';


const main = async () => {

  LoadConfiguration();

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
    () => console.log(`Server started on http://localhost:${GRAPHQL_ENDPOINT_PORT}`),
  );
};

main();

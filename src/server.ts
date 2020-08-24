import 'reflect-metadata';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import { buildSchema } from 'type-graphql';

import { init_db } from './database/init_db';
import { Resolvers } from './schema/Resolvers';

const main = async() => {
  await init_db();
  console.log('Database created.');

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
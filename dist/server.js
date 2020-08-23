"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const apollo_server_express_1 = require("apollo-server-express");
const express_1 = __importDefault(require("express"));
const type_graphql_1 = require("type-graphql");
const init_db_1 = require("./database/init_db");
const Resolvers_1 = require("./schema/Resolvers");
const main = async () => {
    await init_db_1.init_db();
    console.log('Database created.');
    const schema = await type_graphql_1.buildSchema({
        resolvers: [Resolvers_1.Resolvers],
    });
    const apolloServer = new apollo_server_express_1.ApolloServer({ schema });
    const app = express_1.default();
    apolloServer.applyMiddleware({ app });
    app.listen(4000, () => console.log(`Server started on http://localhost:4000${apolloServer.graphqlPath}`));
};
main();
//# sourceMappingURL=server.js.map
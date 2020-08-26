# Server
Represents the core back-end server that manages the representation of the ecoverse and all the entities stored wthin it. 

## Running the server
To run the server in test mode:
* Install dependencies via 'npm install'
* Initialise the data in the server by running 'npm run test-db-reset'
* Start the server by running 'npm start'
* Browse to http://localhost:4000/graphql to interact with the schema

## Technology Stack
The technology stack is as follows:
* GraphQL: for specifying the interactions with the server, using Apollo server
* Node: for runtime execution
* TypeScript: for all logic
* TypeORM: for the orbject relational mapping
* SQLite: for data persistance

Credit: the setup of this project is inspired by the following article: https://medium.com/swlh/graphql-orm-with-typescript-implementing-apollo-server-express-and-sqlite-5f16a92968d0


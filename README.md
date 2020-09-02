# Server
Represents the core back-end server that manages the representation of the ecoverse and all the entities stored wthin it. 

Build Status:
![Docker Image CI](https://github.com/cherrytwist/Server/workflows/Docker%20Image%20CI/badge.svg?branch=master)

## Running the server locally (not in a container)
To run the server in test mode:
* Install dependencies via 'npm install'
* Initialise the data in the server by running 'npm run test-db-reset'
* Have a working mySQL endpoint at port 3306 and configure the endpoint with environment variables (see below)
* Create .env file in your root directory and set values for MYSQL_DATABASE, MYSQL_ROOT_PASSWORD, DATABASE_HOST
* Start the server by running 'npm start'
* Browse to http://localhost:4000/graphql to interact with the schema

## Setup instructions (docker-compose and docker)

Prerequisites: 
- Docker and docker-compose installed on x86 architecture (so not an ARM-based architecture like Raspberry pi)
- ports 80, 4000 and 3306 free on localhost

The following commands are used to run this project:
- `docker-compose up` (to build the server image, pull mySQL image and start the containers)
- `docker exec server.node npm run test-db-reset` (to populate the database with some sample data)

## Technology Stack
The technology stack is as follows:
* GraphQL: for specifying the interactions with the server, using Apollo server
* Node: for runtime execution
* TypeScript: for all logic
* TypeORM: for the orbject relational mapping
* mySQL: for data persistance
* docker: for containers
* docker-compose: for container orchestration

Credit: the setup of this project is inspired by the following article: https://medium.com/swlh/graphql-orm-with-typescript-implementing-apollo-server-express-and-sqlite-5f16a92968d0


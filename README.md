# Server

Represents the core back-end server that manages the representation of the ecoverse and all the entities stored wthin it.

[![Build Status](https://travis-ci.com/cherrytwist/Server.svg?branch=develop)](https://travis-ci.com/cherrytwist/Server) [![Coverage Status](https://coveralls.io/repos/github/cherrytwist/Server/badge.svg?branch=develop)](https://coveralls.io/github/cherrytwist/Server?branch=develop) [![BCH compliance](https://bettercodehub.com/edge/badge/cherrytwist/Server?branch=develop)](https://bettercodehub.com/) ![Docker Image CI](https://github.com/cherrytwist/Server/workflows/Docker%20Image%20CI/badge.svg?branch=master)

## Design

Cherrytwist server uses [NestJS](https://nestjs.com/) as framework and complies to its principles. The code is split into Data Layer (entities), Data Access Layer, Service Layer and an API Layer (GraphQL).
Interactions between different layers is depicted in the Layer Diagram below:

![Layer Diagram](docs/diagrams/ct-server-layer-diagram.png)

The technology stack is as follows:

- GraphQL: for specifying the interactions with the server, using Apollo server
- Node: for runtime execution - **NB: LTS Node version (12.8.3) is currently used for development, and is required for deployment.**
- NestJS as a framework
- TypeScript: for all logic
- TypeORM: for the orbject relational mapping
- mySQL: for data persistance
- docker: for containers
- docker-compose: for container orchestration
- passportjs for authentication
- authentication providers: via one or the support authentication providers (e.g. AAD)
- Winston and Nest-Winston for logging
- Elastic Cloud + Kibana for centralized log management

The server primarily interacts via a _*GraphQL api*_' that it exposes. This can be found at the following location: <http://localhost:4000/graphql> (assuming default port).

This api is used by the [Cherrytwist Web Client](http://github.com/cherrytwist/Client.Web), but also by any other clients / integrations that need to interact with the Cherrytwist server.

## Running the server using containers (docker-compose and docker)

The Cherrytwist platform is a micro-services architecture, which implies that typically multiple dependencies are needed to run the Server. To simplify setting up the Server development environment, a pre-configured docker compose script is provided.

Prerequisites:

- Docker and docker-compose installed on x86 architecture (so not an ARM-based architecture like Raspberry pi)
- ports 4000 (GRAPHQL_ENDPOINT_PORT), 3002 (Simple Auth Provider) and 3306 (MySQL database) free on localhost

Steps:

1. Trigger the docker composition, which will then build the server image, pull the mySQL image and start the containers

   ```bash
   docker-compose --env-file .env.docker up -d --build
   ```

   if .env file has been added use:

   ```bash
   docker-compose up -d --build
   ```

2. Validate that the server is running by visiting the [graphql endpoint](http://localhost:4000/graphql).

Note: the server will be empty after initially being created. To populate the Server with some sample data please use the [Cherrytwist Populator](http://github.com/cherrytwist/Populator) tool which allows easy population from a local file.

## Developing with the server

The easiest way to get going with custom development of the Cherrytwist Server is to leverage the Docker Compose script above, and then disable the Server container! Please consult your docker container adminstration panel for disabling the Cherrytwist Server container.

This then leaves the database container and simple auth provider available and properly configured (nice!).

Assuming you have a suitable database server and authentication provider available then please follow the following steps:

### (1) Install dependencies

```bash
npm install
```

### (2) Start the server

```bash
npm start
```

There should now be a [running Cherrytwist server](http://localhost:4000/graphql)!

### Separate MySQL Database

It is of course also possible to use a separate MySQL database server.

If installing MySQL locally, please refer to [the data management document](docs/DataManagement.md#MySQL-Server-specific-configuration-for-version-8) if using **MySQL 8**.

### Authentication Provider

Similarly the server is designed to allow it to work with multiple Authentication Providers.

The default Authentication Provider for development / demonstration purposes is Simple Auth Provider - which is what is created by the Docker Composition.

Please refer to the [configuration](docs/Configuation.md) for updating the Server to use an alternative instance of Simple Auth Provider or a an alternative Authentication Provider

## Configuration

The Server is responsible for managing the majority of the configuration for the Cherrytwist platform.

Full details of how to configure the Cherrytwist server are available [here](docs/Configuration.md).

## Data Management

The core of Cherrytwist is the domain model that it maintains. Please consult the [following document](docs/DataManagement.md) for additional data management related information - including database migrations.

## Quality Assurance

There is an extensive test harness around the Server - more details on teh QA approach and how to execute test harnesses are available [here](docs/QA.md).

## Pushing code the dockerhub

We have automated the creation and deployment of containers to docker hub via a github action. To automaticly trigger the build up to dockerhub the following steps should be taken:

- Ensure that the code that you would like to create the container from is pushed / merged into the `develop` branch.
- Create a github release and tag it with the appropriate version number ie. `v0.1.3`
- Go to github actions and view the `push to docker` action to see if everything ran correctly.

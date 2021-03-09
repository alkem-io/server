# Design

Cherrytwist server uses [NestJS](https://nestjs.com/) as framework and complies to its principles. The code is split into Data Layer (entities), Data Access Layer, Service Layer and an API Layer (GraphQL).
Interactions between different layers is depicted in the Layer Diagram below:

![Layer Diagram](diagrams/ct-server-layer-diagram.png)

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

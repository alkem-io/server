# Running the server using containers (docker-compose and docker)

The Cherrytwist platform is a micro-services architecture, which implies that typically multiple dependencies are needed to run the Server.

To simplify setting up the Server development environment, a pre-configured docker compose script is provided.

## Prerequisites:

- Docker and docker-compose installed on x86 architecture (so not an ARM-based architecture like Raspberry pi)
- ports 4000 (GRAPHQL_ENDPOINT_PORT), 3002 (Demo Auth Provider) and 3306 (MySQL database) free on localhost

## Steps:

1. Trigger the docker composition, which will then build the server image, pull the mySQL image and start the containers

   ```bash
   docker-compose --env-file .env.docker up -d --build
   ```

   if .env file has been added use:

   ```bash
   docker-compose up -d --build
   ```

2. Validate that the server is running by visiting the [graphql endpoint](http://localhost:4001/graphql).

## Notes

- The docker compose script puts the server listening on port 4001 - to avoid conflict with the default port that is used by local development.
- The server will be empty after initially being created. To populate the Server with some sample data please use the [Cherrytwist Populator](http://github.com/cherrytwist/Populator) tool which allows easy population from a local file. Please remember to specify the correct port to connect to!

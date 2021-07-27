# Running the server using containers (docker-compose and docker)

The Alkemio platform is a micro-services architecture, which implies that typically multiple dependencies are needed to run the Server.

To simplify setting up the Server development environment, a pre-configured docker compose script is provided.

## Prerequisites:

- Docker and docker-compose installed on x86 architecture (so not an ARM-based architecture like Raspberry pi)
- ports 4000 (GRAPHQL_ENDPOINT_PORT), 3002 (Demo Auth Provider) and 3306 (MySQL database) free on localhost

## Steps:

1. Trigger the docker composition, which will then build the server image, pull the mySQL image and start the containers

   ```bash
   docker-compose \
   -f quickstart-services.yml \
   -f quickstart-server.yml \
   --env-file .env.docker \
   up --build --force-recreate
   ```

   if you'd like to debug alkemio server and only need the dependent services, run:

   ```bash
    docker-compose -f quickstart-services.yml --env-file .env.docker up --build --force-recreate
   ```

**Note**: If a container (e.g. Synapse) writes to a directory that is mapped locally, you will need to have enough permissions to write there.
E.g. on Linux you can grant permissions the following way:

- Navigate to the directory, e.g. .build/synapse
- Change the permissions with `chmod o+w .`

2. Validate that the server is running by visiting the [graphql endpoint](http://localhost:4455/graphql).

## Notes

- The docker compose script puts the server listening on port 4001 - to avoid conflict with the default port that is used by local development.
- The server will be empty after initially being created. To populate the Server with some sample data please use the [Alkemio Populator](http://github.com/alkem-io/Populator) tool which allows easy population from a local file. Please remember to specify the correct port to connect to!
- In order to use matrix synapse server, run from the root folder:

```bash
sudo bash ./.scripts/bootstrap_synapse.sh
```

It will use the SYNAPSE_XXX from env.docker, create a configuration in /var/lib/docker/volumes/synapse-data/\_data/, copy them to /var/docker_data/matrix and then map the latter to a volume used in docker-compose.

# Running the server using containers (docker-compose and docker)

The Alkemio platform is a micro-services architecture, which implies that typically multiple dependencies are needed to run the Server.

To simplify setting up the Server development environment, a pre-configured docker compose script is provided.

## Prerequisites:

- Docker and docker-compose installed on x86 architecture (so not an ARM-based architecture like Raspberry pi or MacBook with M1 processor)
- ports available on localhost:
  - 4000 (alkemio server),
  - 3306 (MySQL database)
  - 8888 (traefik dashobard)
  - 3000 (alkemio client)
  - 8008 (synapse server)
  - 5001 (ipfs server)
  - 4436 (mailslurper UI)
  - 4437 (mailslurper API)
  - 5672 (rabbitMQ amqp)
  - 15672 (rabbitMQ management UI)
- Register an alkemio profile for notifications and configure it via SERVICE_ACCOUNT_USERNAME & SERVICE_ACCOUNT_PASSWORD env variables in .env.docker. The profile needs to be Global Community Admin.
- Make sure you're using npm @8.5.5. node v16.15 is recommended (but it should work with v <21)

## Steps:

1. Start the services alkemio server is dependent on:

```bash
npm run start:services
```

2. Run the migrations

```bash
npm run migration:run
```

3. Start alkemio-server

```bash
npm start
```

4. Validate that the server is running by visiting the [graphql endpoint](http://localhost:3000/graphql).

## Notes

- The docker compose script puts the server listening on port 4001 - to avoid conflict with the default port that is used by local development.
- The server will be empty after initially being created. To populate the Server with some sample data please use the [Alkemio Populator](http://github.com/alkem-io/Populator) tool which allows easy population from a local file. Please remember to specify the correct port to connect to!
- In order to use matrix synapse server, run from the root folder:
- If you are using Windows you must go to docker settings -> resources -> file sharing and add the paths to .build and .scripts dirs.

```bash
sudo bash ./.scripts/bootstrap_synapse.sh
```

It will use the SYNAPSE_XXX from env.docker, create a configuration in /var/lib/docker/volumes/synapse-data/\_data/, copy them to /var/docker_data/matrix and then map the latter to a volume used in docker-compose.

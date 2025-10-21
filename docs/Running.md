# Running the server using containers (docker-compose and docker)

The Alkemio platform is a micro-services architecture, which implies that typically multiple dependencies are needed to run the Server.

To simplify setting up the Server development environment, a pre-configured docker compose script is provided.

## Prerequisites:

- Docker and docker-compose installed on x86 architecture\* (so not an ARM-based architecture like Raspberry pi or MacBook with M1 processor)
- Make sure you're using pnpm @9.0.0 or later. node v20.9.0 is recommended (but it should work with v < 21)

\* If you are not on an x86 architecture:

- Docker Desktop for Mac (Apple Silicon) can run x86/amd64 images using emulation.
- [Colima](https://github.com/abiosoft/colima) offers ARM-native Docker environments, but may be slower still, as it is still an emulation.

## Steps:

1. Start the services alkemio server is dependent on (PostgreSQL, MySQL, Ory Kratos, Ory Hydra, Matrix Synapse, RabbitMQ, etc.):

```bash
pnpm run start:services
```

2. Run the migrations

```bash
pnpm run migration:run
```

3. Start alkemio-server

```bash
pnpm start
```

4. Validate that the server is running by visiting the [graphql endpoint](http://localhost:3000/graphql).
5. Optional: verify the OIDC stack
  - Hydra discovery endpoint: `curl http://localhost:3000/.well-known/openid-configuration`
  - Synapse OIDC callback health: check `docker logs alkemio_dev_synapse | grep oidc-hydra`

## Notes

- The docker compose script puts the server listening on port 4001 - to avoid conflict with the default port that is used by local development.
- The server will be almost empty after initially being created. To populate the Server with some sample data please use the [Alkemio Populator](http://github.com/alkem-io/Populator) tool which allows easy population from a local file. Please remember to specify the correct port to connect to!
- Once you set up the services and run the migrations, two alkemio users will be created. Find them in table `users`. You will need to register them in order to set up passwords once you run the web client. If you wish, configure the user needed for notifications via SERVICE_ACCOUNT_USERNAME & SERVICE_ACCOUNT_PASSWORD env variables in .env.docker. The profiles need to be Global Community Admin - you can find this out yourself: Do you see an administration menu item in your Alkemio profiles?
- If you are using Windows you must go to docker settings -> resources -> file sharing and add the paths to .build and .scripts dirs.
- The Synapse ↔ Hydra client credentials are read from `.env.docker` (`SYNAPSE_OIDC_CLIENT_ID` and `SYNAPSE_OIDC_CLIENT_SECRET`). Make sure these values exist before running the services.
- Finally, ports available on localhost:
  - 4000 (alkemio server),
  - 3306 (MySQL database)
  - 8888 (traefik dashboard)
  - 3000 (alkemio client)
  - 8008 (synapse server)
  - 4444 (hydra public)
  - 4445 (hydra admin)
  - 4436 (mailslurper UI)
  - 4437 (mailslurper API)
  - 5672 (rabbitMQ amqp)
  - 15672 (rabbitMQ management UI)

It will use the SYNAPSE_XXX from env.docker, create a configuration in /var/lib/docker/volumes/synapse-data/\_data/, copy them to /var/docker_data/matrix and then map the latter to a volume used in docker-compose.

If you want to run a debug version of kratos, run:

```bash
pnpm run start:services:kratos:debug
```

If you want to run a debug version of any AI service (Engine), do the following:

1. Clone the repo in the same root folder as the server
2. Run the following command:

```bash
pnpm run start:services:ai:debug
```

Note: You may need multiple repositories cloned in order for this command to run. You can search the word `build` in `quickstart-services-ai-debug` and check which contexts are being built. If you need only one service to be built, comment the rest of the services which build the Dockerfile from relative path to the Alkemio Server.

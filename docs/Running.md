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

1. Start the services alkemio server is dependent on:

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

## Notes

- The docker compose script puts the server listening on port 4001 - to avoid conflict with the default port that is used by local development.
- The server will be almost empty after initially being created. To populate the Server with some sample data please use the [Alkemio Populator](http://github.com/alkem-io/Populator) tool which allows easy population from a local file. Please remember to specify the correct port to connect to!
- Once you set up the services and run the migrations, two alkemio users will be created. Find them in table `users`. You will need to register them in order to set up passwords once you run the web client. If you wish, configure the user needed for notifications via SERVICE_ACCOUNT_USERNAME & SERVICE_ACCOUNT_PASSWORD env variables in .env.docker. The profiles need to be Global Community Admin - you can find this out yourself: Do you see an administration menu item in your Alkemio profiles?
- To start the Matrix Synapse service, run the following from the repository root:

```bash
sudo bash ./.scripts/bootstrap_synapse.sh
```

- If you are using Windows you must go to docker settings -> resources -> file sharing and add the paths to .build and .scripts dirs.
- Finally, ports available on localhost:
  - 3000/graphql (alkemio server),
  - 3306 (MySQL database)
  - 8888 (traefik dashboard)
  - 3000 (alkemio client)
  - 8008 (synapse server)
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

## Schema baseline automation prerequisites

- The post-merge workflow `.github/workflows/schema-baseline.yml` regenerates `schema-baseline.graphql` on every push to `develop` and requires a dedicated signing identity.
- Configure the following GitHub Action secrets (repository or environment scoped) before enabling the workflow:
  - `ALKEMIO_INFRASTRUCTURE_BOT_GPG_PRIVATE_KEY`: ASCII-armored private key for the automation identity.
  - `ALKEMIO_INFRASTRUCTURE_BOT_GPG_PASSPHRASE`: Passphrase for the key (set to an empty string when the key is unprotected).
  - `ALKEMIO_INFRASTRUCTURE_BOT_GPG_KEY_ID`: Fingerprint uploaded to GitHub so commits appear as verified.
- Grant the automation key push access to `develop` and verify the public key is registered with the bot account that owns the commits.
- After updating secrets, trigger the workflow manually (`workflow_dispatch`) to confirm the baseline commit path succeeds before relying on automatic runs.

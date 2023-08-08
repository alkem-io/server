# How to use these scriptS?

## Prerequisites

- Create `.env` file in the `backups` folder. Copy the .env.sample and fill in the missing values
- The `mariadb` container needs to be running from `quickstart-servies`, or started with `npm run start:services`

## The following scripts are added

### Restoring latest set of alkemio + synapse database from a specified environment

Run `./restore_latest_backup_set.sh`. You can optionally pass an argument for the environment `dev | acc | prod`. If no argument is passed, `prod` is selected.
The script will: - Validate prerequisites - Invoke `restore_latest_backup.sh` script for both `alkemio` and `synapse` databases. - Update `.env.docker` file with the correct `homeserver` env variables for the specific environment - Update `homeserver.yaml` with the correct server domain - Restart the docker-compose (`quickstart-services`) with `npm run start:services` - Run a loop validating whether the `alkemio_dev_mariadb` container is started. When it starts, it will start the server as well

### Restoring latest alkemio / synapse database

Run `./restore_latest_backup.sh`. You can optionally pass an argument for the storage `mariadb | postgres`. If no argument is passed, `mariadb` is selected. You can optionally pass a second argument for the environment `dev | acc | prod`. If no argument is passed, `prod` is selected. If you want to pass the second argument, first one needs to be passed as well.
The script will: - Validate input parameters - Download the latest `alkemio` or `synapse` database from the `S3` bucket - Restore the database. In the case of `synapse`, it is `drop & create`.

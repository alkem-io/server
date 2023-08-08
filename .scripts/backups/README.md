# How to use these scriptS?

## Prerequisites

- Create `.env` file in the `backups` folder. Copy the .env.sample and fill in the missing values
- The `mariadb` container needs to be running from `quickstart-servies`, or started with `npm run start:services`

## The following scripts are added

### Creating a snapshot of the current local database

Just run `./create_snapshot.sh`. It will create a backup with the name `alkemio.dump.sql` in the `backups` folder

### Restoring a snapshot to the current `alkemio` database

- Just run `./restore_snapshot.sh`. It will restore a backup with the name `alkemio.dump.sql` from the `backups` folder

### Restoring latest set of alkemio + synapse database from a specified environment

Run `./restore_latest_backup_set.sh`. You can optionally pass an argument for the environment `dev | acc | prod`. If no argument is passed, `prod` is selected.
The script will: - Validate prerequisites - Invoke `restore_latest_backup.sh` script for both `alkemio` and `synapse` databases. - Update `.env.docker` file with the correct `homeserver` env variables for the specific environment - Update `homeserver.yaml` with the correct server domain - Restart the docker-compose (`quickstart-services`) with `npm run start:services` - Run a loop validating whether the `alkemio_dev_mariadb` container is started. When it starts, it will start the server as well

### Restoring latest alkemio / synapse database

Run `./restore_latest_backup.sh`. You can optionally pass an argument for the storage `mariadb | postgres`. If no argument is passed, `mariadb` is selected. You can optionally pass a second argument for the environment `dev | acc | prod`. If no argument is passed, `prod` is selected. If you want to pass the second argument, first one needs to be passed as well.
The script will: - Validate input parameters - Download the latest `alkemio` or `synapse` database from the `S3` bucket - Restore the database. In the case of `synapse`, it is `drop & create`.

### Export to CSV

Run `./export_to_csv.sh`.
The script will: - Enumerate all tables in the `alkemio` database - Export them to `csv` files with names the names of the tables into a `/tmp` folder in the `alkemio_dev_mariadb` container.

### Import from CSV

Run `./import_from_csv.sh`.
The script will: - Lookup all files in a local `/tmp` folder in the `alkemio_dev_mariadb` container. - Import the files into matching tables to the filenames.

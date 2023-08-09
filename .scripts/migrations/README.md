# How to use these scriptS?

## Prerequisites

- Create `.env` file in the `backups` folder. Copy the .env.sample and fill in the missing values
- The `mariadb` container needs to be running from `quickstart-servies`, or started with `npm run start:services`

## The following scripts are added

### Creating a snapshot of the current local database

Just run `./create_snapshot.sh`. It will create a backup with the name `alkemio.dump.sql` in the `backups` folder

### Restoring a snapshot to the current `alkemio` database

- Just run `./restore_snapshot.sh`. It will restore a backup with the name `alkemio.dump.sql` from the `backups` folder

### Export to CSV

Run `./export_to_csv.sh`.
The script will:

- Enumerate all tables in the `alkemio` database
- Export them to `csv` files with names the names of the tables into a `/tmp` folder in the `alkemio_dev_mariadb` container.

### Import from CSV

Run `./import_from_csv.sh`.
The script will:

- Lookup all files in a local `/tmp` folder in the `alkemio_dev_mariadb` container.
- Import the files into matching tables to the filenames.

### Compare SQL tables

Run `./compare_sql_tables.sh`.
The script will compare the tables in

- Lookup all files in `/CSVs` folder
- Compares with the files with the same names in `reference_CSVs` folder
- If all tables are the same between the two DBs exporting CSVs, the message `All tables are the same.` is printed to the console
- If there are differences, each table with differences is printed to the console

### Validating a migration

Run `./run_validate_migration.sh`.
The script will do the following

- Create a backup of your current database
- Restore a snapshot from the `/db/reference_schema.sql` script
- Run migrations
- Export the migrated data from the tables to CSVs
- Compare the CSVs to the CSVs in the `/reference_CSVs` folder
- Restore the backed up database

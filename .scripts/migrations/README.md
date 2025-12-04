# How to use these scripts?

## Prerequisites

- Create `.env` file in the `migrations` folder. Copy the `.env.sample` and fill in the missing values
- The `postgres` container needs to be running from `quickstart-services`, or started with `pnpm run start:services`

## The following scripts are available

### Creating a snapshot of the current local databases (`alkemio` / `synapse`)

- Run `./create_snapshot.sh`. It will create a backup with the name `alkemio_dump.sql` in the `migrations` folder
- Run `./create_synapse_snapshot.sh`. It will create a backup with the name `synapse_dump.psql` in the `migrations` folder

### Restoring a snapshot to the current databases (`alkemio` / `synapse`)

- Run `./restore_snapshot.sh`. It will restore a backup with the name `alkemio_dump.sql` from the `migrations` folder
- Run `./restore_synapse_snapshot.sh`. It will restore a backup with the name `synapse_dump.psql` from the `migrations` folder

### Export to CSV

Run `./export_to_csv.sh`.
The script will:

- Enumerate all tables in the `alkemio` PostgreSQL database
- Export them to CSV files with names matching the table names into the `CSVs/` folder

### Import from CSV

Run `./import_from_csv.sh`.
The script will:

- Lookup all CSV files in the `CSVs/` folder
- Import the files into matching tables based on filenames

### Compare SQL tables

Run `./compare_sql_tables.sh`.
The script will compare the tables:

- Lookup all files in the `CSVs/` folder
- Compare with files of the same names in the `reference_CSVs/` folder
- If all tables are the same between the two sets of CSVs, the message `All tables are the same.` is printed to the console
- If there are differences, each table with differences is printed to the console

### Validating a migration

Run `./run_validate_migration.sh`.
The script will do the following:

- Create a backup of your current database
- Restore a snapshot from the `/db/reference_schema.sql` script
- Run migrations
- Export the migrated data from the tables to CSVs
- Compare the CSVs to the CSVs in the `/reference_CSVs` folder
- Restore the backed up database

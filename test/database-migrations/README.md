# Cherrytwist - database migration - test strategy

For the correct processiong of database migration, the following testing is applied:

## Local environment

### Pre-migration phase
- Get local version of "Server" develop branch, which is not containing migration changes and migration script
- Run existing automated tests - all must PASS
- Make a record of all tables
- Meke a record of row count per table
- **Review migration script**
    - Depending on the changes:
        - list all schema changes:
            - Impacted tables
            - Impacted columns (name, type, length, min-max values, mandatory state)
- Create test data to the database, that must be impacted from the migration

### Migration phase
- Stop "Server"service
- Run database migration
- Wait until "Successfull migration" message is returned in the console 

### Postmigration phase
- Start "Server"service
- Verify record with migration name is added in table: `migrations_typeorm`
- Verify all migration changes are correctly applied to the schema
- Verify number of tables is correct
- Verify number of rows noted in pre-migration phase, is correct
    - Depending on the migration, verify that data is removed, update or remains the same
- Run existing automated tests - all must PASS

### Note:
Perform above actions against Dev/Tes and Acc/Prod environments
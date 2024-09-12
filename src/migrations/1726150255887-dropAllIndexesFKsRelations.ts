import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropAllIndexesFKsRelations1726150255887
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const dbName = 'alkemio'; // Your database name

    // 1. Drop all foreign keys that can be deleted
    const foreignKeysResult = await queryRunner.query(`
      SELECT TABLE_NAME, CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE CONSTRAINT_SCHEMA = '${dbName}'
        AND REFERENCED_TABLE_NAME IS NOT NULL;
    `);

    for (const fk of foreignKeysResult) {
      try {
        await queryRunner.query(
          `ALTER TABLE \`${fk.TABLE_NAME}\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``
        );
        console.log(
          `Dropped foreign key ${fk.CONSTRAINT_NAME} on table ${fk.TABLE_NAME}`
        );
      } catch (error) {
        console.error(
          `Could not drop foreign key ${fk.CONSTRAINT_NAME} on table ${fk.TABLE_NAME}:`,
          error
        );
        continue;
      }
    }

    // 2. Drop all unique constraints that can be deleted
    const uniqueConstraintsResult = await queryRunner.query(`
      SELECT TABLE_NAME, CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = '${dbName}'
        AND CONSTRAINT_TYPE = 'UNIQUE';
    `);

    for (const unique of uniqueConstraintsResult) {
      try {
        await queryRunner.query(
          `ALTER TABLE \`${unique.TABLE_NAME}\` DROP INDEX \`${unique.CONSTRAINT_NAME}\``
        );
        console.log(
          `Dropped unique constraint ${unique.CONSTRAINT_NAME} on table ${unique.TABLE_NAME}`
        );
      } catch (error) {
        console.error(
          `Could not drop unique constraint ${unique.CONSTRAINT_NAME} on table ${unique.TABLE_NAME}:`,
          error
        );
        continue;
      }
    }

    // 3. Drop all regular indexes (except primary keys and indexes on AUTO_INCREMENT columns)
    const indexesResult = await queryRunner.query(`
      SELECT s.TABLE_NAME, s.INDEX_NAME, c.COLUMN_NAME, c.EXTRA
      FROM information_schema.STATISTICS s
      JOIN information_schema.COLUMNS c
      ON s.TABLE_NAME = c.TABLE_NAME
      AND s.TABLE_SCHEMA = c.TABLE_SCHEMA
      AND s.COLUMN_NAME = c.COLUMN_NAME
      WHERE s.TABLE_SCHEMA = '${dbName}'
        AND s.INDEX_NAME != 'PRIMARY'
      GROUP BY s.TABLE_NAME, s.INDEX_NAME, c.COLUMN_NAME
    `);

    for (const index of indexesResult) {
      if (index.EXTRA && index.EXTRA.includes('auto_increment')) {
        console.log(
          `Skipping index ${index.INDEX_NAME} on table ${index.TABLE_NAME} (AUTO_INCREMENT column)`
        );
        continue;
      }

      // Try to drop the index
      try {
        await queryRunner.query(
          `DROP INDEX \`${index.INDEX_NAME}\` ON \`${index.TABLE_NAME}\``
        );
        console.log(
          `Dropped index ${index.INDEX_NAME} on table ${index.TABLE_NAME}`
        );
      } catch (error) {
        console.error(
          `Could not drop index ${index.INDEX_NAME} on table ${index.TABLE_NAME}:`,
          error
        );
        continue;
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Logic for down migration can be added here if needed
  }
}

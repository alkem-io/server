import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * With CTI (Class Table Inheritance), the authorizationId and profileId columns
 * should only exist on the base Actor table. The child tables (user, organization,
 * virtual_contributor, space, account) inherited these columns from before CTI was
 * implemented. This migration removes the duplicate columns from child tables.
 *
 * Note: Data was already copied to actor table in the CTI migration
 * (MigrateUserToActor, MigrateOrganizationToActor, etc.)
 */
export class DropDuplicateAuthProfileColumnsFromChildTables1771000018000
  implements MigrationInterface
{
  name = 'DropDuplicateAuthProfileColumnsFromChildTables1771000018000';

  // Tables that had authorizationId and profileId before CTI
  private readonly childTables = [
    'user',
    'organization',
    'virtual_contributor',
    'space',
    'account',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create backup tables for rollback purposes
    for (const table of this.childTables) {
      await queryRunner.query(`
        CREATE TABLE "_auth_profile_backup_${table}" AS
        SELECT "id", "authorizationId", "profileId" FROM "${table}"
      `);
    }

    // Drop FK and unique constraints, then columns for each table
    for (const table of this.childTables) {
      // Drop authorizationId constraints and column
      await this.dropColumnWithConstraints(
        queryRunner,
        table,
        'authorizationId'
      );

      // Drop profileId constraints and column
      await this.dropColumnWithConstraints(queryRunner, table, 'profileId');
    }
  }

  private async dropColumnWithConstraints(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string
  ): Promise<void> {
    // Find and drop any constraints on this column
    const constraints = await queryRunner.query(`
      SELECT con.conname as constraint_name, con.contype as constraint_type
      FROM pg_constraint con
      INNER JOIN pg_class rel ON rel.oid = con.conrelid
      INNER JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
      WHERE rel.relname = '${tableName}'
        AND att.attname = '${columnName}'
    `);

    for (const constraint of constraints) {
      await queryRunner.query(
        `ALTER TABLE "${tableName}" DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}"`
      );
    }

    // Drop any indexes on this column
    const indexes = await queryRunner.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = '${tableName}'
        AND indexdef LIKE '%${columnName}%'
    `);

    for (const index of indexes) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${index.indexname}"`);
    }

    // Check if column exists before dropping
    const columnExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = '${tableName}'
        AND column_name = '${columnName}'
    `);

    if (columnExists.length > 0) {
      await queryRunner.query(
        `ALTER TABLE "${tableName}" DROP COLUMN "${columnName}"`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add columns and restore data from backup
    for (const table of this.childTables) {
      // Check if backup table exists
      const backupExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = '_auth_profile_backup_${table}'
        )
      `);

      if (!backupExists[0]?.exists) {
        continue;
      }

      // Re-add authorizationId column
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "authorizationId" uuid`
      );

      // Re-add profileId column
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "profileId" uuid`
      );

      // Restore data
      await queryRunner.query(`
        UPDATE "${table}" t
        SET
          "authorizationId" = b."authorizationId",
          "profileId" = b."profileId"
        FROM "_auth_profile_backup_${table}" b
        WHERE t."id" = b."id"
      `);

      // Re-add unique constraints
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD CONSTRAINT "UQ_${table}_authorizationId" UNIQUE ("authorizationId")
      `);

      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD CONSTRAINT "UQ_${table}_profileId" UNIQUE ("profileId")
      `);

      // Re-add FK constraints
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD CONSTRAINT "FK_${table}_authorizationId"
        FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id")
        ON DELETE SET NULL
      `);

      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD CONSTRAINT "FK_${table}_profileId"
        FOREIGN KEY ("profileId") REFERENCES "profile"("id")
        ON DELETE SET NULL
      `);
    }

    // Drop backup tables
    for (const table of this.childTables) {
      await queryRunner.query(
        `DROP TABLE IF EXISTS "_auth_profile_backup_${table}"`
      );
    }
  }
}

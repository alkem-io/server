import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * With CTI (Class Table Inheritance), the authorizationId and profileId columns
 * should only exist on the base Actor table. The child tables (user, organization,
 * virtual_contributor, space, account) inherited these columns from before CTI was
 * implemented. This migration removes the duplicate columns from child tables.
 *
 * Note: Data was already copied to actor table in the CTI migration
 * (MigrateUserToActor, MigrateOrganizationToActor, etc.)
 *
 * Column presence per table (from baseline schema):
 *   user:                 authorizationId ✓  profileId ✓
 *   organization:         authorizationId ✓  profileId ✓
 *   virtual_contributor:  authorizationId ✓  profileId ✓
 *   space:                authorizationId ✓  profileId ✗
 *   account:              authorizationId ✓  profileId ✗
 */
export class DropDuplicateAuthProfileColumnsFromChildTables1771000018000
  implements MigrationInterface
{
  name = 'DropDuplicateAuthProfileColumnsFromChildTables1771000018000';

  // Tables that have authorizationId
  private readonly tablesWithAuth = [
    'user',
    'organization',
    'virtual_contributor',
    'space',
    'account',
  ];

  // Tables that also have profileId
  private readonly tablesWithProfile = ['user', 'organization', 'virtual_contributor'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create backup tables for rollback
    for (const table of this.tablesWithAuth) {
      const hasProfile = this.tablesWithProfile.includes(table);
      const profileCol = hasProfile ? ', "profileId"' : '';
      await queryRunner.query(`
        CREATE TABLE "_auth_profile_backup_${table}" AS
        SELECT "id", "authorizationId"${profileCol} FROM "${table}"
      `);
    }

    // Drop authorizationId from all child tables
    for (const table of this.tablesWithAuth) {
      await this.dropColumnWithConstraints(queryRunner, table, 'authorizationId');
    }

    // Drop profileId only from tables that have it
    for (const table of this.tablesWithProfile) {
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
    for (const table of this.tablesWithAuth) {
      const hasProfile = this.tablesWithProfile.includes(table);

      const backupExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = '_auth_profile_backup_${table}'
        )
      `);

      if (!backupExists[0]?.exists) {
        continue;
      }

      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "authorizationId" uuid`
      );

      if (hasProfile) {
        await queryRunner.query(
          `ALTER TABLE "${table}" ADD COLUMN "profileId" uuid`
        );
      }

      const profileSet = hasProfile ? ', "profileId" = b."profileId"' : '';
      await queryRunner.query(`
        UPDATE "${table}" t
        SET "authorizationId" = b."authorizationId"${profileSet}
        FROM "_auth_profile_backup_${table}" b
        WHERE t."id" = b."id"
      `);

      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD CONSTRAINT "UQ_${table}_authorizationId" UNIQUE ("authorizationId")
      `);
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD CONSTRAINT "FK_${table}_authorizationId"
        FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id")
        ON DELETE SET NULL
      `);

      if (hasProfile) {
        await queryRunner.query(`
          ALTER TABLE "${table}"
          ADD CONSTRAINT "UQ_${table}_profileId" UNIQUE ("profileId")
        `);
        await queryRunner.query(`
          ALTER TABLE "${table}"
          ADD CONSTRAINT "FK_${table}_profileId"
          FOREIGN KEY ("profileId") REFERENCES "profile"("id")
          ON DELETE SET NULL
        `);
      }
    }

    for (const table of this.tablesWithAuth) {
      await queryRunner.query(
        `DROP TABLE IF EXISTS "_auth_profile_backup_${table}"`
      );
    }
  }
}

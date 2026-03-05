import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveAgentColumnsFromEntities1771000012000
  implements MigrationInterface
{
  name = 'RemoveAgentColumnsFromEntities1771000012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create backup tables for rollback purposes
    await queryRunner.query(`
      CREATE TABLE "_agent_backup_user" AS
      SELECT "id", "agentId" FROM "user"
    `);
    await queryRunner.query(`
      CREATE TABLE "_agent_backup_organization" AS
      SELECT "id", "agentId" FROM "organization"
    `);
    await queryRunner.query(`
      CREATE TABLE "_agent_backup_virtual_contributor" AS
      SELECT "id", "agentId" FROM "virtual_contributor"
    `);
    await queryRunner.query(`
      CREATE TABLE "_agent_backup_space" AS
      SELECT "id", "agentId" FROM "space"
    `);
    await queryRunner.query(`
      CREATE TABLE "_agent_backup_account" AS
      SELECT "id", "agentId" FROM "account"
    `);

    // Drop FK constraints first (if they exist)
    // User
    await this.dropConstraintIfExists(
      queryRunner,
      'user',
      'FK_b61c694cacfab25533bd23d9ad'
    );
    await this.dropConstraintIfExists(
      queryRunner,
      'user',
      'REL_b61c694cacfab25533bd23d9ad'
    );

    // Organization
    await this.dropConstraintIfExists(
      queryRunner,
      'organization',
      'FK_7f1bec8979b57ed7ebd392a2ca'
    );
    await this.dropConstraintIfExists(
      queryRunner,
      'organization',
      'REL_7f1bec8979b57ed7ebd392a2ca'
    );

    // VirtualContributor
    await this.dropConstraintIfExists(
      queryRunner,
      'virtual_contributor',
      'FK_a8890dcd65b8c3ee6e160d33f3'
    );
    await this.dropConstraintIfExists(
      queryRunner,
      'virtual_contributor',
      'REL_a8890dcd65b8c3ee6e160d33f3'
    );

    // Space
    await this.dropConstraintIfExists(
      queryRunner,
      'space',
      'FK_9c664d684f987a735678b0ba82'
    );
    await this.dropConstraintIfExists(
      queryRunner,
      'space',
      'REL_9c664d684f987a735678b0ba82'
    );

    // Account
    await this.dropConstraintIfExists(
      queryRunner,
      'account',
      'FK_833582df0c439ab8c9adc5240d'
    );
    await this.dropConstraintIfExists(
      queryRunner,
      'account',
      'REL_833582df0c439ab8c9adc5240d'
    );

    // Drop agentId columns from all entity tables
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "agentId"`);
    await queryRunner.query(`ALTER TABLE "organization" DROP COLUMN "agentId"`);
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" DROP COLUMN "agentId"`
    );
    await queryRunner.query(`ALTER TABLE "space" DROP COLUMN "agentId"`);
    await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "agentId"`);
  }

  private async dropConstraintIfExists(
    queryRunner: QueryRunner,
    tableName: string,
    constraintName: string
  ): Promise<void> {
    const constraintExists = await queryRunner.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = '${tableName}'
        AND constraint_name = '${constraintName}'
    `);
    if (constraintExists.length > 0) {
      await queryRunner.query(
        `ALTER TABLE "${tableName}" DROP CONSTRAINT "${constraintName}"`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add agentId columns
    await queryRunner.query(`ALTER TABLE "user" ADD COLUMN "agentId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "organization" ADD COLUMN "agentId" uuid`
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" ADD COLUMN "agentId" uuid`
    );
    await queryRunner.query(`ALTER TABLE "space" ADD COLUMN "agentId" uuid`);
    await queryRunner.query(`ALTER TABLE "account" ADD COLUMN "agentId" uuid`);

    // Restore data from backup tables if they exist
    const backupExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = '_agent_backup_user'
      )
    `);

    if (backupExists[0]?.exists) {
      await queryRunner.query(`
        UPDATE "user" u
        SET "agentId" = b."agentId"
        FROM "_agent_backup_user" b
        WHERE u."id" = b."id"
      `);
      await queryRunner.query(`
        UPDATE "organization" o
        SET "agentId" = b."agentId"
        FROM "_agent_backup_organization" b
        WHERE o."id" = b."id"
      `);
      await queryRunner.query(`
        UPDATE "virtual_contributor" vc
        SET "agentId" = b."agentId"
        FROM "_agent_backup_virtual_contributor" b
        WHERE vc."id" = b."id"
      `);
      await queryRunner.query(`
        UPDATE "space" s
        SET "agentId" = b."agentId"
        FROM "_agent_backup_space" b
        WHERE s."id" = b."id"
      `);
      await queryRunner.query(`
        UPDATE "account" a
        SET "agentId" = b."agentId"
        FROM "_agent_backup_account" b
        WHERE a."id" = b."id"
      `);
    }

    // Re-add unique constraints
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD CONSTRAINT "REL_b61c694cacfab25533bd23d9ad" UNIQUE ("agentId")
    `);
    await queryRunner.query(`
      ALTER TABLE "organization"
      ADD CONSTRAINT "REL_7f1bec8979b57ed7ebd392a2ca" UNIQUE ("agentId")
    `);
    await queryRunner.query(`
      ALTER TABLE "virtual_contributor"
      ADD CONSTRAINT "REL_a8890dcd65b8c3ee6e160d33f3" UNIQUE ("agentId")
    `);
    await queryRunner.query(`
      ALTER TABLE "space"
      ADD CONSTRAINT "REL_9c664d684f987a735678b0ba82" UNIQUE ("agentId")
    `);
    await queryRunner.query(`
      ALTER TABLE "account"
      ADD CONSTRAINT "REL_833582df0c439ab8c9adc5240d" UNIQUE ("agentId")
    `);

    // Re-add FK constraints
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD CONSTRAINT "FK_b61c694cacfab25533bd23d9ad"
      FOREIGN KEY ("agentId") REFERENCES "agent"("id")
      ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "organization"
      ADD CONSTRAINT "FK_7f1bec8979b57ed7ebd392a2ca"
      FOREIGN KEY ("agentId") REFERENCES "agent"("id")
      ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "virtual_contributor"
      ADD CONSTRAINT "FK_a8890dcd65b8c3ee6e160d33f3"
      FOREIGN KEY ("agentId") REFERENCES "agent"("id")
      ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "space"
      ADD CONSTRAINT "FK_9c664d684f987a735678b0ba82"
      FOREIGN KEY ("agentId") REFERENCES "agent"("id")
      ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "account"
      ADD CONSTRAINT "FK_833582df0c439ab8c9adc5240d"
      FOREIGN KEY ("agentId") REFERENCES "agent"("id")
      ON DELETE SET NULL
    `);

    // Drop backup tables
    await queryRunner.query(`DROP TABLE IF EXISTS "_agent_backup_user"`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "_agent_backup_organization"`
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "_agent_backup_virtual_contributor"`
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "_agent_backup_space"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "_agent_backup_account"`);
  }
}

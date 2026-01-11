import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropAgentTable1766840692000 implements MigrationInterface {
  name = 'DropAgentTable1766840692000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create backup of agent table for rollback purposes
    await queryRunner.query(`
      CREATE TABLE "_agent_table_backup" AS
      SELECT * FROM "agent"
    `);

    // Drop FK from credential table to agent (agentId column will remain but no FK)
    await this.dropConstraintIfExists(
      queryRunner,
      'credential',
      'FK_1c0e3a67ae23a1c3e9db3e23b0d'
    );

    // Drop FK from conversation_membership to agent
    await this.dropConstraintIfExists(
      queryRunner,
      'conversation_membership',
      'FK_d348791d10e1f31c61d7f5bd2a7'
    );

    // Drop the agentId column from credential table
    // (data was already migrated to actorId in task 1.7)
    await queryRunner.query(`
      ALTER TABLE "credential" DROP COLUMN IF EXISTS "agentId"
    `);

    // Drop the agentId column from conversation_membership table
    // First drop the index if it exists
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_d348791d10e1f31c61d7f5bd2a"
    `);

    // Need to handle composite primary key - agentId is part of PK
    // Drop the old primary key, drop agentId column, create new PK with actorId
    await queryRunner.query(`
      ALTER TABLE "conversation_membership"
      DROP CONSTRAINT "PK_42dca6e5549063cb4cee1ee1308"
    `);

    await queryRunner.query(`
      ALTER TABLE "conversation_membership"
      DROP COLUMN "agentId"
    `);

    // Add new primary key with actorId
    await queryRunner.query(`
      ALTER TABLE "conversation_membership"
      ADD CONSTRAINT "PK_conversation_membership_conv_actor"
      PRIMARY KEY ("conversationId", "actorId")
    `);

    // Drop the authorization FK from agent table if it exists
    await this.dropConstraintIfExists(
      queryRunner,
      'agent',
      'FK_8ed9d1af584fa62f1ad3405b33'
    );
    await this.dropConstraintIfExists(
      queryRunner,
      'agent',
      'REL_8ed9d1af584fa62f1ad3405b33'
    );

    // Drop the agent table
    await queryRunner.query(`DROP TABLE "agent"`);

    console.log('[Migration] Agent table has been dropped');
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
    // Recreate the agent table
    await queryRunner.query(`
      CREATE TABLE "agent" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1,
        "type" character varying(128),
        "authorizationId" uuid,
        CONSTRAINT "REL_8ed9d1af584fa62f1ad3405b33" UNIQUE ("authorizationId"),
        CONSTRAINT "PK_1000e989398c5d4ed585cf9a46f" PRIMARY KEY ("id")
      )
    `);

    // Restore data from backup if it exists
    const backupExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = '_agent_table_backup'
      )
    `);

    if (backupExists[0]?.exists) {
      await queryRunner.query(`
        INSERT INTO "agent" SELECT * FROM "_agent_table_backup"
      `);
    }

    // Re-add agentId column to credential
    await queryRunner.query(`
      ALTER TABLE "credential" ADD COLUMN "agentId" uuid
    `);

    // Restore agentId from actorId via entity mapping
    await queryRunner.query(`
      UPDATE "credential" c
      SET "agentId" = u."agentId"
      FROM "_agent_backup_user" b
      JOIN "user" u ON b."id" = u."id"
      WHERE c."actorId" = u."id"
    `);

    // Re-add agentId column to conversation_membership
    // First drop the new PK
    await queryRunner.query(`
      ALTER TABLE "conversation_membership"
      DROP CONSTRAINT "PK_conversation_membership_conv_actor"
    `);

    await queryRunner.query(`
      ALTER TABLE "conversation_membership"
      ADD COLUMN "agentId" uuid
    `);

    // Restore agentId from actorId
    await queryRunner.query(`
      UPDATE "conversation_membership" cm
      SET "agentId" = b."agentId"
      FROM "_agent_backup_user" b
      WHERE cm."actorId" = b."id"
    `);

    // Restore original primary key
    await queryRunner.query(`
      ALTER TABLE "conversation_membership"
      ADD CONSTRAINT "PK_42dca6e5549063cb4cee1ee1308"
      PRIMARY KEY ("conversationId", "agentId")
    `);

    // Re-add indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_d348791d10e1f31c61d7f5bd2a"
      ON "conversation_membership" ("agentId")
    `);

    // Re-add FK constraints
    await queryRunner.query(`
      ALTER TABLE "credential"
      ADD CONSTRAINT "FK_1c0e3a67ae23a1c3e9db3e23b0d"
      FOREIGN KEY ("agentId") REFERENCES "agent"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "conversation_membership"
      ADD CONSTRAINT "FK_d348791d10e1f31c61d7f5bd2a7"
      FOREIGN KEY ("agentId") REFERENCES "agent"("id")
      ON DELETE CASCADE
    `);

    // Drop backup table
    await queryRunner.query(`DROP TABLE IF EXISTS "_agent_table_backup"`);
  }
}

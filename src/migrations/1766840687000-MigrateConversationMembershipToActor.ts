import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateConversationMembershipToActor1766840687000
  implements MigrationInterface
{
  name = 'MigrateConversationMembershipToActor1766840687000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add the new actorId column
    await queryRunner.query(`
      ALTER TABLE "conversation_membership" ADD COLUMN "actorId" uuid
    `);

    // Step 2: Migrate User memberships (agent -> user -> actor)
    await queryRunner.query(`
      UPDATE "conversation_membership" cm
      SET "actorId" = u."id"
      FROM "user" u
      WHERE cm."agentId" = u."agentId"
    `);

    // Step 3: Migrate VirtualContributor memberships
    await queryRunner.query(`
      UPDATE "conversation_membership" cm
      SET "actorId" = vc."id"
      FROM "virtual_contributor" vc
      WHERE cm."agentId" = vc."agentId"
        AND cm."actorId" IS NULL
    `);

    // Step 4: Migrate Organization memberships (if any)
    await queryRunner.query(`
      UPDATE "conversation_membership" cm
      SET "actorId" = o."id"
      FROM "organization" o
      WHERE cm."agentId" = o."agentId"
        AND cm."actorId" IS NULL
    `);

    // Step 5: Migrate Space memberships (if any)
    await queryRunner.query(`
      UPDATE "conversation_membership" cm
      SET "actorId" = s."id"
      FROM "space" s
      WHERE cm."agentId" = s."agentId"
        AND cm."actorId" IS NULL
    `);

    // Step 6: Migrate Account memberships (if any)
    await queryRunner.query(`
      UPDATE "conversation_membership" cm
      SET "actorId" = a."id"
      FROM "account" a
      WHERE cm."agentId" = a."agentId"
        AND cm."actorId" IS NULL
    `);

    // Step 7: Create index on actorId for performance
    await queryRunner.query(`
      CREATE INDEX "IDX_conversation_membership_actorId"
      ON "conversation_membership" ("actorId")
    `);

    // Step 8: Add FK constraint to actor table
    await queryRunner.query(`
      ALTER TABLE "conversation_membership"
      ADD CONSTRAINT "FK_conversation_membership_actorId"
      FOREIGN KEY ("actorId") REFERENCES "actor"("id")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop FK constraint
    await queryRunner.query(`
      ALTER TABLE "conversation_membership"
      DROP CONSTRAINT "FK_conversation_membership_actorId"
    `);

    // Drop index
    await queryRunner.query(`
      DROP INDEX "IDX_conversation_membership_actorId"
    `);

    // Drop the actorId column
    await queryRunner.query(`
      ALTER TABLE "conversation_membership" DROP COLUMN "actorId"
    `);
  }
}

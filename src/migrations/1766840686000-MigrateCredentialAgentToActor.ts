import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateCredentialAgentToActor1766840686000
  implements MigrationInterface
{
  name = 'MigrateCredentialAgentToActor1766840686000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add the new actorId column
    await queryRunner.query(`
      ALTER TABLE "credential" ADD COLUMN "actorId" uuid
    `);

    // Step 2: Migrate User credentials (agent -> user -> actor)
    // credential.agentId = agent.id, user.agentId = agent.id, so user.id = actor.id
    await queryRunner.query(`
      UPDATE "credential" c
      SET "actorId" = u."id"
      FROM "user" u
      WHERE c."agentId" = u."agentId"
    `);

    // Step 3: Migrate Organization credentials
    await queryRunner.query(`
      UPDATE "credential" c
      SET "actorId" = o."id"
      FROM "organization" o
      WHERE c."agentId" = o."agentId"
        AND c."actorId" IS NULL
    `);

    // Step 4: Migrate VirtualContributor credentials
    await queryRunner.query(`
      UPDATE "credential" c
      SET "actorId" = vc."id"
      FROM "virtual_contributor" vc
      WHERE c."agentId" = vc."agentId"
        AND c."actorId" IS NULL
    `);

    // Step 5: Migrate Space credentials
    await queryRunner.query(`
      UPDATE "credential" c
      SET "actorId" = s."id"
      FROM "space" s
      WHERE c."agentId" = s."agentId"
        AND c."actorId" IS NULL
    `);

    // Step 6: Migrate Account credentials
    await queryRunner.query(`
      UPDATE "credential" c
      SET "actorId" = a."id"
      FROM "account" a
      WHERE c."agentId" = a."agentId"
        AND c."actorId" IS NULL
    `);

    // Step 7: Add FK constraint to actor table
    await queryRunner.query(`
      ALTER TABLE "credential"
      ADD CONSTRAINT "FK_credential_actorId"
      FOREIGN KEY ("actorId") REFERENCES "actor"("id")
      ON DELETE CASCADE
    `);

    // Step 8: Create index on actorId for performance
    await queryRunner.query(`
      CREATE INDEX "IDX_credential_actorId" ON "credential" ("actorId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX "IDX_credential_actorId"`);

    // Drop FK constraint
    await queryRunner.query(`
      ALTER TABLE "credential" DROP CONSTRAINT "FK_credential_actorId"
    `);

    // Drop the actorId column
    await queryRunner.query(`
      ALTER TABLE "credential" DROP COLUMN "actorId"
    `);
  }
}

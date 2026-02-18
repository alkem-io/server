import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateActorTable1771000001000 implements MigrationInterface {
  name = 'CreateActorTable1771000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the Actor table with Class Table Inheritance structure
    await queryRunner.query(`
      CREATE TABLE "actor" (
        "id" uuid NOT NULL,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1,
        "type" "actor_type_enum" NOT NULL,
        "profileId" uuid,
        "authorizationId" uuid,
        CONSTRAINT "PK_actor_id" PRIMARY KEY ("id")
      )
    `);

    // Create index on type column for efficient type-based queries
    await queryRunner.query(`
      CREATE INDEX "IDX_actor_type" ON "actor" ("type")
    `);

    // Add FK constraint to profile table (nullable)
    await queryRunner.query(`
      ALTER TABLE "actor"
      ADD CONSTRAINT "FK_actor_profileId"
      FOREIGN KEY ("profileId") REFERENCES "profile"("id")
      ON DELETE SET NULL
    `);

    // Add FK constraint to authorization_policy table
    await queryRunner.query(`
      ALTER TABLE "actor"
      ADD CONSTRAINT "FK_actor_authorizationId"
      FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id")
      ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop FK constraints first
    await queryRunner.query(`
      ALTER TABLE "actor" DROP CONSTRAINT "FK_actor_authorizationId"
    `);
    await queryRunner.query(`
      ALTER TABLE "actor" DROP CONSTRAINT "FK_actor_profileId"
    `);

    // Drop index
    await queryRunner.query(`DROP INDEX "IDX_actor_type"`);

    // Drop the table
    await queryRunner.query(`DROP TABLE "actor"`);
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReactionTable1785800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Generic reaction store for callout (and future) emoji reactions.
    // One row per (type, entityID, createdBy); the unique index also serves
    // the batched GROUP BY queries for the tier-1 summary reader.
    //
    // entityID carries no database FK: the target entity's delete flow removes
    // reactions explicitly before deleting the target row (delete-reactions-first
    // ordering). This keeps the table generic and avoids cross-domain FK
    // dependencies.
    //
    // createdBy has a real FK → user ON DELETE CASCADE so a deleted account
    // automatically removes all of that person's reactions.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reaction" (
        "id"          uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "createdDate" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "version"     integer      NOT NULL,
        "type"        varchar(32)  NOT NULL,
        "entityID"    uuid         NOT NULL,
        "createdBy"   uuid         NOT NULL,
        "emoji"       varchar(32)  NOT NULL,
        CONSTRAINT "PK_reaction" PRIMARY KEY ("id"),
        CONSTRAINT "FK_reaction_createdBy_user"
          FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_reaction_type_entityId_createdBy"
        ON "reaction" ("type", "entityID", "createdBy")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_reaction_type_entityId_createdBy"`
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "reaction"`);
  }
}

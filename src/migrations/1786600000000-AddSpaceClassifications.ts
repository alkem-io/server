import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Introduces structured Classifications on a Space's About.
 *
 * - `classification_entry`: one new table, `spaceAboutId` FK to
 *   `space_about(id)` ON DELETE CASCADE, plus its index. No FK to any
 *   template and no FK to the pre-existing `classification` container —
 *   under operator ruling D1 the entry hangs directly off `space_about`, and
 *   the shipped container gains nothing.
 * - `template`: two nullable columns (`classificationCardinality`,
 *   `classificationValueSet`) for the new CLASSIFICATION template type.
 *
 * No backfill, no `space_about` schema change, and no `authorization_policy`
 * rows — entries carry no policy of their own; every write authorizes
 * against the owning SpaceAbout's existing policy, so there is nothing to
 * reset (D1).
 */
export class AddSpaceClassifications1786600000000
  implements MigrationInterface
{
  name = 'AddSpaceClassifications1786600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "classification_entry" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1,
        "displayLabel" character varying(128) NOT NULL,
        "cardinality" character varying(128) NOT NULL,
        "valueSet" jsonb NOT NULL,
        "selectedValueIDs" jsonb NOT NULL DEFAULT '[]',
        "display" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL,
        "spaceAboutId" uuid,
        CONSTRAINT "PK_classification_entry_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_classification_entry_spaceAboutId"
        ON "classification_entry" ("spaceAboutId")
    `);

    await queryRunner.query(`
      ALTER TABLE "classification_entry"
        ADD CONSTRAINT "FK_classification_entry_spaceAboutId"
        FOREIGN KEY ("spaceAboutId") REFERENCES "space_about"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "template"
        ADD "classificationCardinality" character varying(128)
    `);
    await queryRunner.query(`
      ALTER TABLE "template" ADD "classificationValueSet" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ROLLBACK NOTE — destructive and unrecoverable: dropping
    // `classification_entry` and the two `template` classification columns
    // permanently deletes every Space classification entry and every
    // Classification Template's vocabulary. Back up `classification_entry`
    // and `template.classificationCardinality` /
    // `template.classificationValueSet` before reverting; re-running up()
    // recreates empty structures only (the bootstrap seed restores just the
    // seeded SDGs template, never user data).
    await queryRunner.query(
      `ALTER TABLE "template" DROP COLUMN "classificationValueSet"`
    );
    await queryRunner.query(
      `ALTER TABLE "template" DROP COLUMN "classificationCardinality"`
    );
    await queryRunner.query(
      `ALTER TABLE "classification_entry" DROP CONSTRAINT "FK_classification_entry_spaceAboutId"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_classification_entry_spaceAboutId"`
    );
    await queryRunner.query(`DROP TABLE "classification_entry"`);
  }
}

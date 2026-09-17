import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds the single nullable marker that distinguishes live form drafts. */
export class WhiteboardDraft1787500000000 implements MigrationInterface {
  name = 'WhiteboardDraft1787500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "whiteboard" ADD "draftExpiresAt" TIMESTAMP WITH TIME ZONE'
    );
    await queryRunner.query(`
      CREATE INDEX "IDX_whiteboard_draft_expiry"
        ON "whiteboard" ("draftExpiresAt")
        WHERE "draftExpiresAt" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM "whiteboard" WHERE "draftExpiresAt" IS NOT NULL LIMIT 1
        ) THEN
          RAISE EXCEPTION 'Refusing to remove draftExpiresAt while live Whiteboard drafts exist';
        END IF;
      END $$
    `);
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_whiteboard_draft_expiry"');
    await queryRunner.query('ALTER TABLE "whiteboard" DROP COLUMN "draftExpiresAt"');
  }
}

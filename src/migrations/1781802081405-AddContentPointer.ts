import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the NULLABLE `contentPointer` collaboration index column to the `memo` and
 * `whiteboard` tables (FR-001): the file-service id of the document's stored
 * Yjs-V2 snapshot. file-service is the SINGLE storage backend for the Alkemio
 * stack, so there is no store-kind column — content always lives in file-service.
 *
 * Release A (staged rollout): the column is added NULLABLE with NO back-fill.
 * `contentPointer IS NULL` means "not yet migrated" — the operator back-fill
 * (`CollaborationMigrationService.migrateAll`) converts each legacy document's
 * content to a real file-service snapshot and sets the pointer to the resulting
 * file-service id (never the row id). A later Release B enforces `NOT NULL` and
 * drops the legacy content columns, but only after the back-fill is verified.
 * Reversible: `down()` drops the column.
 */
export class AddContentPointer1781802081405 implements MigrationInterface {
  name = 'AddContentPointer1781802081405';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "memo" ADD "contentPointer" character varying(512)`
    );
    await queryRunner.query(
      `ALTER TABLE "whiteboard" ADD "contentPointer" character varying(512)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "whiteboard" DROP COLUMN "contentPointer"`
    );
    await queryRunner.query(`ALTER TABLE "memo" DROP COLUMN "contentPointer"`);
  }
}

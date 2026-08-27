import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the NULLABLE `contentPointer` collaboration index column to the `memo` and
 * `whiteboard` tables (FR-001): the file-service id of the document's stored
 * Yjs-V2 snapshot. file-service is the SINGLE storage backend for the Alkemio
 * stack, so there is no store-kind column — content always lives in file-service.
 *
 * Release A: the column is added NULLABLE with NO back-fill. The temporary
 * `migrated` marker added by the companion migration identifies the legacy
 * cohort; the operator mutations convert each legacy document's content to a
 * real file-service snapshot and atomically publish the pointer + marker. A
 * later cleanup release fails-closed on any
 * NULL/blank pointer under its write fence and drops ONLY the legacy content
 * columns (`memo.content`, `whiteboard.content`), after the back-fill is verified;
 * the `contentPointer` column STAYS NULLABLE — the ordinary create path has a
 * transient NULL before its initial snapshot pointer is attached.
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

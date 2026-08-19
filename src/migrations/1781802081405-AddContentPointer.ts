import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `contentPointer` collaboration index column to the `memo` and
 * `whiteboard` tables (FR-001): the file-service id of the document's stored
 * Yjs-V2 snapshot. file-service is the SINGLE storage backend for the Alkemio
 * stack, so there is no store-kind column — content always lives in file-service.
 *
 * Existing rows are back-filled so `contentPointer = <row id>`; the up-front batch
 * migration then converts each document's content to a file-service snapshot and
 * repoints it. Reversible: `down()` drops the column.
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
    await queryRunner.query(`UPDATE "memo" SET "contentPointer" = "id"::varchar`);
    await queryRunner.query(
      `UPDATE "whiteboard" SET "contentPointer" = "id"::varchar`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "whiteboard" DROP COLUMN "contentPointer"`
    );
    await queryRunner.query(`ALTER TABLE "memo" DROP COLUMN "contentPointer"`);
  }
}

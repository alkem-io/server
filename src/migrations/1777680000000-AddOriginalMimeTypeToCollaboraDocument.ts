import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `originalMimeType` to `collabora_document`. Drives the rename
 * helper's extension preservation: `documentType` alone (4 broad
 * categories) is too coarse — a `.doc` and `.docx` are both
 * `WORDPROCESSING` but rename must keep them distinct. Also paves the
 * way for the import flow (087-collabora-import), which stores the
 * sniffed MIME from file-service-go directly.
 *
 * Backfill rule for any existing rows: every row before this migration
 * was created by the blank-create flow, so the documentType-to-OOXML
 * mapping is unambiguous and lossless. Backfill, then enforce NOT NULL.
 *
 * Rollback note: down() drops the column. Existing rename behavior
 * before this column existed used `documentType` directly, so the
 * application falls back to that path when the column is absent (no
 * data loss on a roll-back, just a less precise rename for any
 * future imports — which won't exist if we've rolled back).
 */
export class AddOriginalMimeTypeToCollaboraDocument1777680000000
    implements MigrationInterface
{
    name = 'AddOriginalMimeTypeToCollaboraDocument1777680000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add nullable first so existing rows survive the ALTER.
        await queryRunner.query(
            `ALTER TABLE "collabora_document" ADD "originalMimeType" varchar(128)`
        );
        // Backfill from the documentType → OOXML default that the blank-
        // create flow has used since the table was introduced.
        await queryRunner.query(
            `UPDATE "collabora_document" SET "originalMimeType" = CASE "documentType"
                WHEN 'spreadsheet' THEN 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                WHEN 'presentation' THEN 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                WHEN 'wordprocessing' THEN 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                WHEN 'drawing' THEN 'application/vnd.oasis.opendocument.graphics'
            END WHERE "originalMimeType" IS NULL`
        );
        // Enforce NOT NULL once every existing row is populated.
        await queryRunner.query(
            `ALTER TABLE "collabora_document" ALTER COLUMN "originalMimeType" SET NOT NULL`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverse of up(): just drop the column. The pre-existing rename
        // path didn't use this column, so nothing else needs un-doing.
        await queryRunner.query(
            `ALTER TABLE "collabora_document" DROP COLUMN "originalMimeType"`
        );
    }
}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIndexVisualMediaGalleryIdDocumentTagsetId1773926813813 implements MigrationInterface {
    name = 'AddIndexVisualMediaGalleryIdDocumentTagsetId1773926813813'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_visual_mediaGalleryId" ON "visual" ("mediaGalleryId")`);
        await queryRunner.query(`CREATE INDEX "IDX_document_tagsetId" ON "document" ("tagsetId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_document_tagsetId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_visual_mediaGalleryId"`);
    }

}

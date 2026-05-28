import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCollaboraDocumentToCalloutFraming1777000000001 implements MigrationInterface {
    name = 'AddCollaboraDocumentToCalloutFraming1777000000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Rollback: down() drops FK first, then UNIQUE constraint, then the column.
        // ON DELETE SET NULL keeps existing callout_framing rows valid if a
        // referenced collabora_document is deleted instead of cascading.
        await queryRunner.query(`ALTER TABLE "callout_framing" ADD "collaboraDocumentId" uuid`);
        await queryRunner.query(`ALTER TABLE "callout_framing" ADD CONSTRAINT "UQ_dbd3481be6d2fe514a7dbc158d3" UNIQUE ("collaboraDocumentId")`);
        await queryRunner.query(`ALTER TABLE "callout_framing" ADD CONSTRAINT "FK_dbd3481be6d2fe514a7dbc158d3" FOREIGN KEY ("collaboraDocumentId") REFERENCES "collabora_document"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverse order of up(): drop FK before UNIQUE before the column.
        await queryRunner.query(`ALTER TABLE "callout_framing" DROP CONSTRAINT "FK_dbd3481be6d2fe514a7dbc158d3"`);
        await queryRunner.query(`ALTER TABLE "callout_framing" DROP CONSTRAINT "UQ_dbd3481be6d2fe514a7dbc158d3"`);
        await queryRunner.query(`ALTER TABLE "callout_framing" DROP COLUMN "collaboraDocumentId"`);
    }

}

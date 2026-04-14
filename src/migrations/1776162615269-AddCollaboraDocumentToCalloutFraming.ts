import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCollaboraDocumentToCalloutFraming1776162615269 implements MigrationInterface {
    name = 'AddCollaboraDocumentToCalloutFraming1776162615269'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "callout_framing" ADD "collaboraDocumentId" uuid`);
        await queryRunner.query(`ALTER TABLE "callout_framing" ADD CONSTRAINT "UQ_dbd3481be6d2fe514a7dbc158d3" UNIQUE ("collaboraDocumentId")`);
        await queryRunner.query(`ALTER TABLE "callout_framing" ADD CONSTRAINT "FK_dbd3481be6d2fe514a7dbc158d3" FOREIGN KEY ("collaboraDocumentId") REFERENCES "collabora_document"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "callout_framing" DROP CONSTRAINT "FK_dbd3481be6d2fe514a7dbc158d3"`);
        await queryRunner.query(`ALTER TABLE "callout_framing" DROP CONSTRAINT "UQ_dbd3481be6d2fe514a7dbc158d3"`);
        await queryRunner.query(`ALTER TABLE "callout_framing" DROP COLUMN "collaboraDocumentId"`);
    }

}

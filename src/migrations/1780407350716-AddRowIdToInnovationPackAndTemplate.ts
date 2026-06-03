import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRowIdToInnovationPackAndTemplate1780407350716 implements MigrationInterface {
name = 'AddRowIdToInnovationPackAndTemplate1780407350716'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "template" ADD "rowId" SERIAL NOT NULL`);
    await queryRunner.query(`ALTER TABLE "template" ADD CONSTRAINT "UQ_d9a42feddd7089b159246887910" UNIQUE ("rowId")`);
    await queryRunner.query(`ALTER TABLE "innovation_pack" ADD "rowId" SERIAL NOT NULL`);
    await queryRunner.query(`ALTER TABLE "innovation_pack" ADD CONSTRAINT "UQ_1fc637141a64418fb8220d46a84" UNIQUE ("rowId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "innovation_pack" DROP CONSTRAINT "UQ_1fc637141a64418fb8220d46a84"`);
    await queryRunner.query(`ALTER TABLE "innovation_pack" DROP COLUMN "rowId"`);
    await queryRunner.query(`ALTER TABLE "template" DROP CONSTRAINT "UQ_d9a42feddd7089b159246887910"`);
    await queryRunner.query(`ALTER TABLE "template" DROP COLUMN "rowId"`);
  }
}

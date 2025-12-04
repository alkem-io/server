import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveAccountUpn1764590889001 implements MigrationInterface {
  name = 'RemoveAccountUpn1764590889001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "UQ_c09b537a5d76200c622a0fd0b70"`
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "accountUpn"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "accountUpn" character varying(128)`
    );
    await queryRunner.query(`UPDATE "user" SET "accountUpn" = "email"`);
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "accountUpn" SET NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "UQ_c09b537a5d76200c622a0fd0b70" UNIQUE ("accountUpn")`
    );
  }
}

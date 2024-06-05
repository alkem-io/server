import { MigrationInterface, QueryRunner } from 'typeorm';

export class increasePdfSize1717573360692 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "alkemio"."storage_bucket" SET "maxFileSize" = 15728640 WHERE "maxFileSize" = 5242880;`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "alkemio"."storage_bucket" SET "maxFileSize" = 5242880 WHERE "maxFileSize" = 15728640;`
    );
  }
}

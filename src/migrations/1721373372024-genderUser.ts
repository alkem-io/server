import { MigrationInterface, QueryRunner } from 'typeorm';

export class genderUser1721373372024 implements MigrationInterface {
  name = 'genderUser1721373372024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`gender\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

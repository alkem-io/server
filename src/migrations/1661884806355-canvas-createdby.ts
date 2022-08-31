import { MigrationInterface, QueryRunner } from 'typeorm';

export class canvasCreatedby1661884806355 implements MigrationInterface {
  name = 'canvasCreatedby1661884806355';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`createdBy\` varchar(36) NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`canvas\` DROP COLUMN \`createdBy\``);
  }
}

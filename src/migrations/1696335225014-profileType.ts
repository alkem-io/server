import { MigrationInterface, QueryRunner } from 'typeorm';

export class profileType1696335225014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`type\` text NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`profile\` DROP COLUMN \`type\``);
  }
}

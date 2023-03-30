import { MigrationInterface, QueryRunner } from 'typeorm';

export class calloutGroup1680019551937 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`group\` varchar(32) NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`callout\` DROP COLUMN \`group\``);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class calloutTemplateType1698689237022 implements MigrationInterface {
  name = 'calloutTemplateType1698689237022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD \`type\` varchar(255) NOT NULL`
    );
    await queryRunner.query(`UPDATE callout_template SET type = 'post'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP COLUMN \`type\``
    );
  }
}

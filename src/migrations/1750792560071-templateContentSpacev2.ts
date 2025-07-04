import { MigrationInterface, QueryRunner } from 'typeorm';

export class TemplateContentSpacev21750792560071 implements MigrationInterface {
  name = 'TemplateContentSpacev21750792560071';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`template_content_space\` ADD \`parentSpaceId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`template_content_space\` ADD CONSTRAINT \`FK_9e2017ee8cfa420bcac748b85db\` FOREIGN KEY (\`parentSpaceId\`) REFERENCES \`template_content_space\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`template_content_space\` DROP FOREIGN KEY \`FK_9e2017ee8cfa420bcac748b85db\``
    );
    await queryRunner.query(
      `ALTER TABLE \`template_content_space\` DROP COLUMN \`parentSpaceId\``
    );
  }
}

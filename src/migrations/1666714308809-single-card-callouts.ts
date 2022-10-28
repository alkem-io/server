import { MigrationInterface, QueryRunner } from 'typeorm';

export class singleCardCallouts1666714308809 implements MigrationInterface {
  name = 'singleCardCallouts1666714308809';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`cardTemplateId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD UNIQUE INDEX \`IDX_22a2ec1b5bca6c54678ffb19eb\` (\`cardTemplateId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_22a2ec1b5bca6c54678ffb19eb\` ON \`callout\` (\`cardTemplateId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_22a2ec1b5bca6c54678ffb19eb0\` FOREIGN KEY (\`cardTemplateId\`) REFERENCES \`aspect_template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout\`  DROP FOREIGN KEY \`FK_22a2ec1b5bca6c54678ffb19eb0\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_22a2ec1b5bca6c54678ffb19eb\` ON \`callout\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP INDEX \`IDX_22a2ec1b5bca6c54678ffb19eb\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`cardTemplateId\``
    );
  }
}

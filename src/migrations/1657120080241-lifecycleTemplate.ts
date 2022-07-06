import { MigrationInterface, QueryRunner } from 'typeorm';

export class lifecycleTemplate1657120080241 implements MigrationInterface {
  name = 'lifecycleTemplate1657120080241';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create lifecycle_template
    await queryRunner.query(
      `CREATE TABLE \`lifecycle_template\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
             \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
              \`version\` int NOT NULL, \`templatesSetId\` char(36) NULL, \`templateInfoId\` char(36) NULL,
              \`authorizationId\` varchar(36) NULL, \`definition\` LONGTEXT NOT NULL, \`type\` char(128) NOT NULL,
              UNIQUE INDEX \`REL_76542ccdda9ba57d8e3a634cd8\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`lifecycle_template\` ADD CONSTRAINT \`FK_76546901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`lifecycle_template\` ADD CONSTRAINT \`FK_76547901817dd09d5906537e088\` FOREIGN KEY (\`templateInfoId\`) REFERENCES \`template_info\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`lifecycle_template\` ADD CONSTRAINT \`FK_76546450cf75dc486700ca034c6\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // FK: template info
    await queryRunner.query(
      'ALTER TABLE `lifecycle_template` DROP FOREIGN KEY `FK_76547901817dd09d5906537e088`'
    );
    // FK: templates set
    await queryRunner.query(
      'ALTER TABLE `lifecycle_template` DROP FOREIGN KEY `FK_76546450cf75dc486700ca034c6`'
    );
    await queryRunner.query('DROP TABLE `lifecycle_template`');
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class classificationTagsets1688193761861 implements MigrationInterface {
  name = 'classificationTagsets1688193761861';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`tagset_template\` (\`id\` char(36) NOT NULL,
                                             \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                             \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                             \`version\` int NOT NULL,
                                             \`name\` varchar(255) NULL,
                                             \`type\` varchar(255) NULL,
                                             \`allowedValues\` text NULL,
                                             \`tagsetTemplateSetId\` char(36) NULL,
                                              PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );

    await queryRunner.query(
      `CREATE TABLE \`tagset_template_set\` (\`id\` char(36) NOT NULL,
                                             \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                             \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                             \`version\` int NOT NULL,
                                              PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );

    await queryRunner.query(
      'ALTER TABLE `tagset` ADD `tagsetTemplateId` char(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` ADD `type` varchar(255) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_flow` ADD `tagsetTemplateSetId` char(36) NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `tagset` ADD CONSTRAINT `FK_7ab35130cde781b69259eec7d85` FOREIGN KEY (`tagsetTemplateId`) REFERENCES `tagset_template`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset_template` ADD CONSTRAINT `FK_9ad35130cde781b69259eec7d85` FOREIGN KEY (`tagsetTemplateSetId`) REFERENCES `tagset_template_set`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );

    // Add type freeform to all existing tagsets
    const tagsets: { id: string }[] = await queryRunner.query(
      `SELECT id FROM tagset`
    );
    for (const tagset of tagsets) {
      await queryRunner.query(
        `UPDATE tagset SET type = 'freeform' WHERE (id = '${tagset.id}')`
      );
    }

    // Add tagset template set to each innovationFlow
    const innovationFlows: { id: string }[] = await queryRunner.query(
      `SELECT id FROM innovation_flow`
    );
    for (const innovationFlow of innovationFlows) {
      const tagsetTemplateSetID = randomUUID();
      await queryRunner.query(`
                INSERT INTO tagset_template_set (id, createdDate, updatedDate, version)
                                          VALUES ('${tagsetTemplateSetID}', NOW(), NOW(), 1)
                `);
      await queryRunner.query(
        `UPDATE innovation_flow SET tagsetTemplateSetId = '${tagsetTemplateSetID}' WHERE (id = '${innovationFlow.id}')`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // tagset ==> tagset_template
    await queryRunner.query(
      `ALTER TABLE \`tagset\` DROP FOREIGN KEY \`FK_7ab35130cde781b69259eec7d85\``
    );
    // tagset_template ==> tagset_template_set
    await queryRunner.query(
      `ALTER TABLE \`tagset_template\` DROP FOREIGN KEY \`FK_9ad35130cde781b69259eec7d85\``
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_flow` DROP COLUMN `tagsetTemplateSetId`'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` DROP COLUMN `tagsetTemplateId`'
    );
    await queryRunner.query('ALTER TABLE `tagset` DROP COLUMN `type`');
    await queryRunner.query('DROP TABLE `tagset_template_set`');
    await queryRunner.query('DROP TABLE `tagset_template`');
  }
}

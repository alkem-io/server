import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { escapeString } from './utils/escape-string';

export class templatesSet1654842042827 implements MigrationInterface {
  name = 'templatesSet1654842042827';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create templates_set
    await queryRunner.query(
      `CREATE TABLE \`templates_set\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
             \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
              \`version\` int NOT NULL,
               \`authorizationId\` varchar(36) NULL,
                UNIQUE INDEX \`REL_66666ccdda9ba57d8e3a634cd8\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` ADD CONSTRAINT \`FK_66666901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Link templates_set to hxb
    await queryRunner.query(
      `ALTER TABLE \`hxb\` ADD \`templatesSetId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`hxb\` ADD CONSTRAINT \`FK_33336901817dd09d5906537e088\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Create template_info
    await queryRunner.query(
      `CREATE TABLE \`template_info\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
             \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
              \`version\` int NOT NULL, \`title\` varchar(128) NOT NULL, \`description\` text NOT NULL, \`tagsetId\` char(36) NULL, \`visualId\` char(36) NULL,
              PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`template_info\` ADD CONSTRAINT \`FK_77777901817dd09d5906537e088\` FOREIGN KEY (\`tagsetId\`) REFERENCES \`tagset\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template_info\` ADD CONSTRAINT \`FK_88888901817dd09d5906537e088\` FOREIGN KEY (\`visualId\`) REFERENCES \`visual\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Create aspect_template
    await queryRunner.query(
      `CREATE TABLE \`aspect_template\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
             \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
              \`version\` int NOT NULL, \`templatesSetId\` char(36) NULL, \`templateInfoId\` char(36) NULL,
              \`authorizationId\` varchar(36) NULL, \`type\` char(128) NOT NULL, \`defaultDescription\` text NOT NULL,
              UNIQUE INDEX \`REL_44447ccdda9ba57d8e3a634cd8\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect_template\` ADD CONSTRAINT \`FK_44446901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect_template\` ADD CONSTRAINT \`FK_66667901817dd09d5906537e088\` FOREIGN KEY (\`templateInfoId\`) REFERENCES \`template_info\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect_template\` ADD CONSTRAINT \`FK_66666450cf75dc486700ca034c6\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // Create canvas_template
    await queryRunner.query(
      `CREATE TABLE \`canvas_template\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
             \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
              \`version\` int NOT NULL, \`templatesSetId\` char(36) NULL, \`templateInfoId\` char(36) NULL,
              \`authorizationId\` varchar(36) NULL, \`value\` LONGTEXT NOT NULL,
              UNIQUE INDEX \`REL_88888ccdda9ba57d8e3a634cd8\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_template\` ADD CONSTRAINT \`FK_45556901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_template\` ADD CONSTRAINT \`FK_65557901817dd09d5906537e088\` FOREIGN KEY (\`templateInfoId\`) REFERENCES \`template_info\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_template\` ADD CONSTRAINT \`FK_65556450cf75dc486700ca034c6\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // Migrate the existing Aspect Templates data or create default Aspect Templates
    const hxbs: any[] = await queryRunner.query(`SELECT id, template from hxb`);
    for (const hxb of hxbs) {
      // Set authorization on templates_set + also link to hxb
      const authID = randomUUID();
      const templatesSetID = randomUUID();
      await queryRunner.query(
        `INSERT INTO authorization_policy VALUES ('${authID}', NOW(), NOW(), 1, '', '', 0, '')`
      );
      await queryRunner.query(
        `INSERT INTO templates_set (id, createdDate, updatedDate, version, authorizationId) VALUES ('${templatesSetID}', NOW(), NOW(), 1, '${authID}')`
      );
      await queryRunner.query(
        `UPDATE hxb SET templatesSetId = '${templatesSetID}' WHERE (id = '${hxb.id}')`
      );

      // Create the aspect templates
      const existingTemplate: any = hxb.template;
      if (existingTemplate) {
        console.log('Found existing template, so migrating...');
        const existingTemplateJson = JSON.parse(existingTemplate);
        for (const aspectTemplate of existingTemplateJson.aspectTemplates) {
          // create the new aspect template objects from the existing data
          const aspectTemplateID = randomUUID();
          const aspectTemplateAuthID = randomUUID();
          const templateInfoID = randomUUID();
          const tagsetID = randomUUID();
          const tagsetAuthID = randomUUID();
          const visualID = randomUUID();
          const visualAuthID = randomUUID();
          await queryRunner.query(
            `INSERT INTO authorization_policy VALUES ('${tagsetAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
          );
          await queryRunner.query(
            `INSERT INTO authorization_policy VALUES ('${visualAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
          );
          await queryRunner.query(
            `INSERT INTO authorization_policy VALUES ('${aspectTemplateAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
          );
          await queryRunner.query(
            `INSERT INTO tagset (id, createdDate, updatedDate, version, name, tags, authorizationId)
          VALUES ('${tagsetID}', NOW(), NOW(), 1, 'default', '', '${tagsetAuthID}')`
          );
          await queryRunner.query(
            `INSERT INTO visual (id, createdDate, updatedDate, version, authorizationId, name, uri, minWidth, maxWidth, minHeight, maxHeight, aspectRatio, allowedTypes)
          VALUES ('${visualID}', NOW(), NOW(), 1, '${visualAuthID}', '${templateVisual.name}', '', '${templateVisual.minWidth}', '${templateVisual.maxWidth}', '${templateVisual.minHeight}', '${templateVisual.maxHeight}', '${templateVisual.aspectRatio}', '${allowedTypes}')`
          );
          await queryRunner.query(
            `INSERT INTO template_info (id, createdDate, updatedDate, version, title, description, tagsetId, visualId)
          VALUES ('${templateInfoID}', NOW(), NOW(), 1, '${
              aspectTemplate.type
            }', '${escapeString(
              aspectTemplate.typeDescription
            )}', '${tagsetID}', '${visualID}')`
          );
          await queryRunner.query(
            `INSERT INTO aspect_template (id, createdDate, updatedDate, version, authorizationId, templatesSetId, templateInfoId, type, defaultDescription)
          VALUES ('${aspectTemplateID}', NOW(), NOW(), 1, '${aspectTemplateAuthID}', '${templatesSetID}', '${templateInfoID}', '${
              aspectTemplate.type
            }', '${escapeString(aspectTemplate.defaultDescription)}')`
          );
        }
      } else {
        // create the default aspect templates
        for (const aspectTemplate of templatesSetDefaults.aspects) {
          const aspectTemplateID = randomUUID();
          const aspectTemplateAuthID = randomUUID();
          const templateInfoID = randomUUID();
          const tagsetID = randomUUID();
          const tagsetAuthID = randomUUID();
          const visualID = randomUUID();
          const visualAuthID = randomUUID();
          await queryRunner.query(
            `INSERT INTO authorization_policy VALUES ('${tagsetAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
          );
          await queryRunner.query(
            `INSERT INTO authorization_policy VALUES ('${visualAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
          );
          await queryRunner.query(
            `INSERT INTO authorization_policy VALUES ('${aspectTemplateAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
          );
          await queryRunner.query(
            `INSERT INTO tagset (id, createdDate, updatedDate, version, name, tags, authorizationId)
            VALUES ('${tagsetID}', NOW(), NOW(), 1, 'default', '', '${tagsetAuthID}')`
          );
          await queryRunner.query(
            `INSERT INTO visual (id, createdDate, updatedDate, version, authorizationId, name, uri, minWidth, maxWidth, minHeight, maxHeight, aspectRatio, allowedTypes)
            VALUES ('${visualID}', NOW(), NOW(), 1, '${visualAuthID}', '${templateVisual.name}', '', '${templateVisual.minWidth}', '${templateVisual.maxWidth}', '${templateVisual.minHeight}', '${templateVisual.maxHeight}', '${templateVisual.aspectRatio}', '${allowedTypes}')`
          );
          await queryRunner.query(
            `INSERT INTO template_info (id, createdDate, updatedDate, version, title, description, tagsetId, visualId)
          VALUES ('${templateInfoID}', NOW(), NOW(), 1, '${
              aspectTemplate.title
            }', '${escapeString(
              aspectTemplate.description
            )}', '${tagsetID}', '${visualID}')`
          );
          await queryRunner.query(
            `INSERT INTO aspect_template (id, createdDate, updatedDate, version, authorizationId, templatesSetId, templateInfoId, type, defaultDescription)
          VALUES ('${aspectTemplateID}', NOW(), NOW(), 1, '${aspectTemplateAuthID}', '${templatesSetID}', '${templateInfoID}', '${
              aspectTemplate.type
            }', '${escapeString(aspectTemplate.defaultDescription)}')`
          );
        }
      }
    }

    await queryRunner.query(`ALTER TABLE \`hxb\` DROP COLUMN \`template\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: data is not migrated down, only the structure
    await queryRunner.query(
      'ALTER TABLE `hxb` DROP FOREIGN KEY `FK_33336901817dd09d5906537e088`'
    );
    // FK: template info
    await queryRunner.query(
      'ALTER TABLE `aspect_template` DROP FOREIGN KEY `FK_66667901817dd09d5906537e088`'
    );
    // FK: templates set
    await queryRunner.query(
      'ALTER TABLE `aspect_template` DROP FOREIGN KEY `FK_66666450cf75dc486700ca034c6`'
    );
    // FK: template info
    await queryRunner.query(
      'ALTER TABLE `canvas_template` DROP FOREIGN KEY `FK_65557901817dd09d5906537e088`'
    );
    // FK: templates set
    await queryRunner.query(
      'ALTER TABLE `canvas_template` DROP FOREIGN KEY `FK_65556450cf75dc486700ca034c6`'
    );

    await queryRunner.query(
      `ALTER TABLE \`hxb\` DROP COLUMN \`templatesSetId\``
    );

    await queryRunner.query(
      `ALTER TABLE \`hxb\` ADD \`template\` text NOT NULL`
    );
    await queryRunner.query('DROP TABLE `templates_set`');
    await queryRunner.query('DROP TABLE `aspect_template`');
    await queryRunner.query('DROP TABLE `canvas_template`');
    await queryRunner.query('DROP TABLE `template_info`');
  }
}

const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
const templateVisual = {
  name: 'bannerNarrow',
  minWidth: 384,
  maxWidth: 768,
  minHeight: 128,
  maxHeight: 256,
  aspectRatio: 3,
};

// NOTE: this has to be in this file; it should NOT have a dependency back to the domain model
const templatesSetDefaults: any = {
  aspects: [
    {
      title: 'knowledge',
      type: 'knowledge',
      description: 'To share relevant knowledge, building blocks etc.',
      defaultDescription: 'Please describe the knowledge that is relevant.',
      tags: [],
    },
    {
      title: 'stakeholder persona',
      type: 'stakeholder persona',
      description:
        'To share a relevant persona, who would be either actively engaged, impacted by results, needs to informed, supportive etc',
      defaultDescription:
        'Please describe the stakeholder persona that is relevant.',
      tags: [],
    },
    {
      title: 'related initiative',
      type: 'related initiative',
      description:
        'Other initiatives that are relevant, be they similar in nature, supporting or just to be aware of.',
      defaultDescription:
        'Please describe the related initiative that is relevant.',
      tags: [],
    },
    {
      title: 'idea',
      type: 'idea',
      description:
        'Ideas that are later elicited and can be used to make progress.',
      defaultDescription: 'Please describe the idea that is relevant.',
      tags: [],
    },
    {
      title: 'other',
      type: 'other',
      description:
        'Any other relevant information that can contribute to make progress.',
      defaultDescription: 'Please describe the aspect that you wish to share.',
      tags: [],
    },
  ],
};

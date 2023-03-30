import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { escapeString } from './utils/escape-string';
import { InnovationFlowType } from '@common/enums/innovation.flow.type';

export class lifecycleTemplate1657204515370 implements MigrationInterface {
  name = 'lifecycleTemplate1657204515370';

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

    // Add in defaults to all TemplatesSets
    const templatesSets: any[] = await queryRunner.query(
      `SELECT id from templates_set`
    );
    for (const templatesSet of templatesSets) {
      // create the new lifecycle template objects from the existing data
      for (const lifecycleDefault of defaultLifecycles) {
        const lifecycleTemplateID = randomUUID();
        const lifecycleTemplateAuthID = randomUUID();
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
          `INSERT INTO authorization_policy VALUES ('${lifecycleTemplateAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
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
   VALUES ('${templateInfoID}', NOW(), NOW(), 1, '${lifecycleDefault.title}', '${lifecycleDefault.description}', '${tagsetID}', '${visualID}')`
        );
        const escapedDefinition = escapeString(
          JSON.stringify(lifecycleDefault.definition)
        );
        await queryRunner.query(
          `INSERT INTO lifecycle_template (id, createdDate, updatedDate, version, authorizationId, templatesSetId, templateInfoId, type, definition)
   VALUES ('${lifecycleTemplateID}', NOW(), NOW(), 1, '${lifecycleTemplateAuthID}', '${templatesSet.id}', '${templateInfoID}', '${lifecycleDefault.type}', '${escapedDefinition}')`
        );
      }
    }
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

// NOTE: this has to be in this file; it should NOT have a dependency back to the domain model
const challengeLifecycleConfigDefault: any = {
  id: 'challenge-lifecycle-default',
  context: {
    parentID: '',
  },
  initial: 'new',
  states: {
    new: {
      on: {
        REFINE: {
          target: 'beingRefined',
          cond: 'challengeStateUpdateAuthorized',
        },
        ABANDONED: {
          target: 'abandoned',
          cond: 'challengeStateUpdateAuthorized',
        },
      },
    },
    beingRefined: {
      on: {
        ACTIVE: {
          target: 'inProgress',
          cond: 'challengeStateUpdateAuthorized',
        },
        ABANDONED: {
          target: 'abandoned',
          cond: 'challengeStateUpdateAuthorized',
        },
      },
    },
    inProgress: {
      entry: ['sampleEvent'],
      on: {
        COMPLETED: {
          target: 'complete',
          cond: 'challengeStateUpdateAuthorized',
        },
        ABANDONED: {
          target: 'abandoned',
          cond: 'challengeStateUpdateAuthorized',
        },
      },
    },
    complete: {
      on: {
        ARCHIVE: 'archived',
        ABANDONED: 'abandoned',
      },
    },
    abandoned: {
      on: {
        REOPEN: 'inProgress',
        ARCHIVE: 'archived',
      },
    },
    archived: {
      type: 'final',
    },
  },
};

const opportunityLifecycleConfigDefault: any = {
  id: 'opportunity-lifecycle-default',
  context: {
    parentID: '',
  },
  initial: 'new',
  states: {
    new: {
      on: {
        REFINE: 'beingRefined',
        ABANDONED: 'abandoned',
      },
    },
    beingRefined: {
      on: {
        ACTIVE: 'inProgress',
        ABANDONED: 'abandoned',
      },
    },
    inProgress: {
      entry: ['sampleEvent'],
      on: {
        COMPLETED: 'complete',
        ABANDONED: 'abandoned',
      },
    },
    complete: {
      on: {
        ARCHIVE: 'archived',
        ABANDONED: 'archived',
      },
    },
    abandoned: {
      on: {
        REOPEN: 'inProgress',
        ARCHIVE: 'archived',
      },
    },
    archived: {
      type: 'final',
    },
  },
};

const defaultLifecycles: any = [
  {
    type: InnovationFlowType.CHALLENGE,
    definition: challengeLifecycleConfigDefault,
    title: 'Default Challenge lifecycle',
    description: 'Default Challenge lifecycle',
  },
  {
    type: InnovationFlowType.OPPORTUNITY,
    definition: opportunityLifecycleConfigDefault,
    title: 'Default Opportunity lifecycle',
    description: 'Default Challenge lifecycle',
  },
];

const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
const templateVisual = {
  name: 'bannerNarrow',
  minWidth: 384,
  maxWidth: 768,
  minHeight: 128,
  maxHeight: 256,
  aspectRatio: 3,
};

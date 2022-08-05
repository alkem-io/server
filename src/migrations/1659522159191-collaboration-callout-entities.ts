import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { generateNameID } from './utils/generate-nameid';

const migrateRelationsFromOpportunity = async (
  queryRunner: QueryRunner,
  opportunityId: string,
  collaborationID: string
) => {
  // Add collaborationId to Relations on Opportunity
  const relations = await queryRunner.query(
    `SELECT id FROM \`relation\` WHERE relation.opportunityId = '${opportunityId}'`
  );
  for (const relation of relations) {
    await queryRunner.query(
      `UPDATE \`relation\` SET collaborationId = '${collaborationID}' WHERE id = '${relation.id}'`
    );
  }
};

const migrateAspectsAndCanvases = async (
  queryRunner: QueryRunner,
  entityName: string
) => {
  const entities = await queryRunner.query(
    `SELECT id, contextId FROM \`${entityName}\``
  );
  for (const entity of entities) {
    const collaborationID = randomUUID();
    const authID = randomUUID();

    // Create the Collaboration object
    await queryRunner.query(
      `INSERT INTO authorization_policy
        VALUES ('${authID}', NOW(), NOW(), 1, '', '', 0, '')`
    );
    await queryRunner.query(
      `INSERT INTO collaboration (id, version, authorizationId)
        VALUES ('${collaborationID}', 1, '${authID}')`
    );

    // Add collaborationId to Entity
    await queryRunner.query(
      `UPDATE \`${entityName}\` SET collaborationId = '${collaborationID}' WHERE id = '${entity.id}'`
    );

    // If Entity is Opportunity, migrate relations
    if (entityName == 'opportunity')
      await migrateRelationsFromOpportunity(
        queryRunner,
        entity.id,
        collaborationID
      );

    // Create Callout object for old Aspects and add refs: Callout -> Collaboration, Aspect -> Callout
    const aspectsCalloutID = randomUUID();
    const aspectCalloutAuthID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy
        VALUES ('${aspectCalloutAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
    );
    const aspectCalloutNameID = generateNameID('Other cards', true, 20);
    const aspectCalloutDescription =
      'This callout contains all cards created before the callout feature was released.';
    await queryRunner.query(
      `INSERT INTO \`callout\` (id, version, displayName, nameID, description, type, state, visibility, authorizationId, collaborationId)
        VALUES ('${aspectsCalloutID}', 1, 'Other cards', '${aspectCalloutNameID}', '${aspectCalloutDescription}', 'card', 'open', 'published', '${aspectCalloutAuthID}', '${collaborationID}')`
    );

    const aspects = await queryRunner.query(
      `SELECT id FROM \`aspect\` WHERE contextId = '${entity.contextId}'`
    );
    for (const aspect of aspects) {
      await queryRunner.query(
        `UPDATE \`aspect\` SET calloutId = '${aspectsCalloutID}' WHERE id = '${aspect.id}'`
      );
    }

    // Create Callout object for old Canvases and add refs: Callout -> Collaboration, Canvas -> Callout
    const canvasesCalloutID = randomUUID();
    const canvasesCalloutAuthID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy
        VALUES ('${canvasesCalloutAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
    );
    const canvasCalloutNameID = generateNameID('Other canvases', true, 20);
    const canvasCalloutDescription =
      'This callout contains all canvas created before the callout feature was released.';
    await queryRunner.query(
      `INSERT INTO \`callout\` (id, version, displayName, nameID, description, type, state, visibility, authorizationId, collaborationId)
        VALUES ('${canvasesCalloutID}', 1, 'Other canvases', '${canvasCalloutNameID}', '${canvasCalloutDescription}', 'canvas', 'open', 'published', '${canvasesCalloutAuthID}', '${collaborationID}')`
    );

    const canvases = await queryRunner.query(
      `SELECT id FROM \`canvas\` WHERE contextId = '${entity.contextId}'`
    );
    for (const canvas of canvases) {
      await queryRunner.query(
        `UPDATE \`canvas\` SET calloutId = '${canvasesCalloutID}' WHERE id = '${canvas.id}'`
      );
    }
  }
};
export class collaborationCalloutEntities1659522159191
  implements MigrationInterface
{
  name = 'collaborationCalloutEntities1659522159191';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`collaboration\` (\`id\` varchar(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`authorizationId\` varchar(36) NULL, UNIQUE INDEX \`REL_262ecf3f5d70b82a4833618425\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`callout\` (\`id\` varchar(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`displayName\` varchar(255) NOT NULL, \`nameID\` varchar(255) NOT NULL, \`description\` text NOT NULL, \`type\` text NOT NULL, \`state\` text NOT NULL DEFAULT 'open', \`visibility\` text NOT NULL DEFAULT 'draft', \`authorizationId\` varchar(36) NULL, \`discussionId\` varchar(36) NULL, \`collaborationId\` varchar(36) NULL, UNIQUE INDEX \`REL_6289dee12effb51320051c6f1f\` (\`authorizationId\`), UNIQUE INDEX \`REL_62ed316cda7b75735b20307b47\` (\`discussionId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`collaborationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD UNIQUE INDEX \`IDX_6325f4ef25c4e07e723a96ed37\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`collaborationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD UNIQUE INDEX \`IDX_fa617e79d6b2926edc7b4a3878\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`collaborationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD UNIQUE INDEX \`IDX_d4551f18fed106ae2e20c70f7c\` (\`collaborationId\`)`
    );

    // Add calloutId to canvas
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`calloutId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_fcabc1f3aa38aca70df4f66e938\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`relation\` ADD \`collaborationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` ADD CONSTRAINT \`FK_701a6f8e3e1da76354571767c3f\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_262ecf3f5d70b82a48336184251\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_6289dee12effb51320051c6f1fc\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_62ed316cda7b75735b20307b47e\` FOREIGN KEY (\`discussionId\`) REFERENCES \`discussion\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_9b1c5ee044611ac78249194ec35\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // Add calloutId to aspect
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`calloutId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_deceb07e75a8600e38d5de14a89\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_6325f4ef25c4e07e723a96ed37c\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_fa617e79d6b2926edc7b4a3878f\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_d4551f18fed106ae2e20c70f7cb\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await migrateAspectsAndCanvases(queryRunner, 'hub');
    await migrateAspectsAndCanvases(queryRunner, 'challenge');
    await migrateAspectsAndCanvases(queryRunner, 'opportunity');

    // Drop contextId FOREIGN KEY and column in canvas table
    await queryRunner.query(
      'ALTER TABLE `canvas` DROP FOREIGN KEY `FK_09b225228f9d675758232a43441`'
    );
    await queryRunner.query(`ALTER TABLE \`canvas\` DROP COLUMN \`contextId\``);

    // Drop opportunityId FOREIGN KEY in relation table
    await queryRunner.query(
      `ALTER TABLE \`relation\` DROP FOREIGN KEY \`FK_d6d967126caae9df4c763985f9b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` DROP COLUMN \`opportunityId\``
    );

    // Drop contextId FOREIGN KEY and column in aspect table
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`contextId\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`contextId\` varchar(36) NULL DEFAULT 'NULL'`
    );
    // await queryRunner.query(
    //   'ALTER TABLE `aspect` ADD CONSTRAINT `FK_6c57bb50b3b6fb4943c807c83ce` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    // );

    await queryRunner.query(
      `ALTER TABLE \`relation\` ADD \`opportunityId\` varchar(36) NULL DEFAULT 'NULL'`
    );
    // await queryRunner.query(
    //   `ALTER TABLE \`relation\` ADD CONSTRAINT \`FK_d6d967126caae9df4c763985f9b\` FOREIGN KEY (\`opportunityId\`) REFERENCES \`opportunity\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    // );

    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`contextId\` char(36) NULL DEFAULT 'NULL'`
    );
    // await queryRunner.query(
    //   'ALTER TABLE `canvas` ADD CONSTRAINT `FK_09b225228f9d675758232a43441` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    // );

    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_d4551f18fed106ae2e20c70f7cb\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_fa617e79d6b2926edc7b4a3878f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_6325f4ef25c4e07e723a96ed37c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_deceb07e75a8600e38d5de14a89\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_9b1c5ee044611ac78249194ec35\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_62ed316cda7b75735b20307b47e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_6289dee12effb51320051c6f1fc\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_262ecf3f5d70b82a48336184251\``
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` DROP FOREIGN KEY \`FK_701a6f8e3e1da76354571767c3f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_fcabc1f3aa38aca70df4f66e938\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP INDEX \`IDX_d4551f18fed106ae2e20c70f7c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`collaborationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP INDEX \`IDX_fa617e79d6b2926edc7b4a3878\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`collaborationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP INDEX \`IDX_6325f4ef25c4e07e723a96ed37\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP COLUMN \`collaborationId\``
    );
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`calloutId\``);
    await queryRunner.query(
      `ALTER TABLE \`relation\` DROP COLUMN \`collaborationId\``
    );
    await queryRunner.query(`ALTER TABLE \`canvas\` DROP COLUMN \`calloutId\``);
    await queryRunner.query(
      `DROP INDEX \`REL_62ed316cda7b75735b20307b47\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6289dee12effb51320051c6f1f\` ON \`callout\``
    );
    await queryRunner.query(`DROP TABLE \`callout\``);
    await queryRunner.query(
      `DROP INDEX \`REL_262ecf3f5d70b82a4833618425\` ON \`collaboration\``
    );
    await queryRunner.query(`DROP TABLE \`collaboration\``);
  }
}

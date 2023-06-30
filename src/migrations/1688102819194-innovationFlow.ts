import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class innovationFlow1688102819194 implements MigrationInterface {
  name = 'innovationFlow1688102819194';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove the FK constraints

    // challenge ==> lifecycle
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_3c535130cde781b69259eec7d85\``
    );
    // opportunity ==> lifecycle
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_6860f1e3ae5509245bdb5c401f3\``
    );
    // space ==> lifecycle
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_ec1a68698d32f610a5fc1880c7f\``
    );

    await queryRunner.query(
      `CREATE TABLE \`innovation_flow\` (\`id\` char(36) NOT NULL,
                                             \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                             \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                             \`version\` int NOT NULL,
                                             \`spaceID\` char(36) NOT NULL,
                                             \`type\` varchar(255) NULL,
                                             \`authorizationId\` char(36) NULL,
                                             \`lifecycleId\` char(36) NULL,
                                             \`profileId\` char(36) NULL,
                                             UNIQUE INDEX \`REL_98a7abc9f297ffcacb53087dc8\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );

    await queryRunner.query(
      'ALTER TABLE `challenge` ADD `innovationFlowId` char(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD `innovationFlowId` char(36) NULL'
    );

    const challenges: { id: string; lifecycleId: string; spaceID: string }[] =
      await queryRunner.query(`SELECT id, lifecycleId, spaceID FROM challenge`);
    for (const challenge of challenges) {
      await this.createInnovationFlowLink(
        queryRunner,
        'challenge',
        challenge.id,
        challenge.lifecycleId,
        challenge.spaceID
      );
    }

    const opportunities: {
      id: string;
      lifecycleId: string;
      spaceID: string;
    }[] = await queryRunner.query(
      `SELECT id, lifecycleId, spaceID FROM opportunity`
    );
    for (const opportunity of opportunities) {
      await this.createInnovationFlowLink(
        queryRunner,
        'opportunity',
        opportunity.id,
        opportunity.lifecycleId,
        opportunity.spaceID
      );
    }

    await queryRunner.query(
      'ALTER TABLE `innovation_flow` ADD CONSTRAINT `FK_da1a68698d32f610a5fc1880c7f` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_flow` ADD CONSTRAINT `FK_da7368698d32f610a5fc1880c7f` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_flow` ADD CONSTRAINT `FK_4b4a68698d32f610a5fc1880c7f` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_4c435130cde781b69259eec7d85` FOREIGN KEY (`innovationFlowId`) REFERENCES `innovation_flow`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_4840f1e3ae5509245bdb5c401f3` FOREIGN KEY (`innovationFlowId`) REFERENCES `innovation_flow`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );

    await queryRunner.query(
      `ALTER TABLE \`space\` DROP COLUMN \`lifecycleId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`lifecycleId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`lifecycleId\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // challenge ==> innovation_flow
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_4c435130cde781b69259eec7d85\``
    );
    // opportunity ==> innovation_flow
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_4840f1e3ae5509245bdb5c401f3\``
    );
    // innovation_flow ==> profile
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP FOREIGN KEY \`FK_da7368698d32f610a5fc1880c7f\``
    );
    // innovation_flow ==> authorization
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP FOREIGN KEY \`FK_da1a68698d32f610a5fc1880c7f\``
    );
    // innovation_flow ==> lifecycle
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP FOREIGN KEY \`FK_4b4a68698d32f610a5fc1880c7f\``
    );

    await queryRunner.query(
      'ALTER TABLE `space` ADD `lifecycleId` char(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD `lifecycleId` char(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD `lifecycleId` char(36) NULL'
    );

    const challenges: { id: string; innovationFlowId: string }[] =
      await queryRunner.query(`SELECT id, innovationFlowId FROM challenge`);
    for (const challenge of challenges) {
      const innovationFlows: { id: string; lifecycleId: string }[] =
        await queryRunner.query(
          `SELECT id, lifecycleId FROM innovation_flow WHERE id='${challenge.innovationFlowId}'`
        );
      if (innovationFlows.length !== 1) continue;
      const innovationFlow = innovationFlows[0];
      await queryRunner.query(
        `UPDATE challenge SET lifecycleId = '${innovationFlow.lifecycleId}' WHERE (id = '${challenge.id}')`
      );
    }

    const opportunities: {
      id: string;
      innovationFlowId: string;
    }[] = await queryRunner.query(
      `SELECT id, innovationFlowId FROM opportunity`
    );
    for (const opportunity of opportunities) {
      const innovationFlows: { id: string; lifecycleId: string }[] =
        await queryRunner.query(
          `SELECT id, lifecycleId FROM innovation_flow WHERE id='${opportunity.innovationFlowId}'`
        );
      if (innovationFlows.length !== 1) continue;
      const innovationFlow = innovationFlows[0];
      await queryRunner.query(
        `UPDATE opportunity SET lifecycleId = '${innovationFlow.lifecycleId}' WHERE (id = '${opportunity.id}')`
      );
    }

    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_3c535130cde781b69259eec7d85` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_6860f1e3ae5509245bdb5c401f3` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_ec1a68698d32f610a5fc1880c7f` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );

    await queryRunner.query(
      'ALTER TABLE `challenge` DROP COLUMN `innovationFlowId`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP COLUMN `innovationFlowId`'
    );
    await queryRunner.query('DROP TABLE `innovation_flow`');
  }

  private async createInnovationFlowLink(
    queryRunner: QueryRunner,
    tableName: string,
    journeyID: string,
    lifecycleId: string,
    spaceID: string
  ): Promise<void> {
    const authorizationID = randomUUID();
    const profileID = randomUUID();
    const profileAuthID = randomUUID();
    const profileLocationID = randomUUID();
    const profileVisualID = randomUUID();
    const profileVisualAuthID = randomUUID();
    const innovationFlowID = randomUUID();

    await queryRunner.query(`
                INSERT INTO authorization_policy (id, createdDate, updatedDate, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules)
                                          VALUES ('${authorizationID}', NOW(), NOW(), 1, '', '', 0, '')
                `);
    await queryRunner.query(`
                INSERT INTO authorization_policy (id, createdDate, updatedDate, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules)
                                          VALUES ('${profileAuthID}', NOW(), NOW(), 1, '', '', 0, '')
                `);
    await queryRunner.query(`
                INSERT INTO authorization_policy (id, createdDate, updatedDate, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules)
                                          VALUES ('${profileVisualAuthID}', NOW(), NOW(), 1, '', '', 0, '')
                `);
    await queryRunner.query(
      `INSERT INTO profile (id, version, authorizationId, locationId, description, displayName)
            VALUES ('${profileID}',
                    '1',
                    '${profileAuthID}',
                    '${profileLocationID}',
                    '',
                    '')`
    );
    await queryRunner.query(
      `INSERT INTO visual (id, createdDate, updatedDate, version, name, uri, minWidth, maxWidth, minHeight, maxHeight, aspectRatio, allowedTypes, authorizationId, profileId)
          VALUES ('${profileVisualID}', NOW(), NOW(), 1, '${templateVisual.name}', '', '${templateVisual.minWidth}', '${templateVisual.maxWidth}', '${templateVisual.minHeight}', '${templateVisual.maxHeight}', '${templateVisual.aspectRatio}', '${allowedTypes}', '${profileVisualAuthID}', '${profileID}')`
    );
    await queryRunner.query(
      `INSERT INTO location (id, version, city, country)
            values ('${profileLocationID}', 1,  '', '')`
    );
    await queryRunner.query(
      `INSERT INTO innovation_flow (id, version, authorizationId, profileId, lifecycleId, type, spaceID)
            VALUES ('${innovationFlowID}',
                    '1',
                    '${authorizationID}',
                    '${profileID}',
                    '${lifecycleId}',
                    '${tableName}',
                    '${spaceID}')`
    );
    await queryRunner.query(
      `UPDATE ${tableName} SET innovationFlowId = '${innovationFlowID}' WHERE (id = '${journeyID}')`
    );
  }
}

const templateVisual = {
  name: 'bannerNarrow',
  minWidth: 307,
  maxWidth: 410,
  minHeight: 192,
  maxHeight: 256,
  aspectRatio: 1.6,
};

const allowedTypes = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
];

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
                                             \`defaultSelectedValue\` varchar(255) NULL,
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
      'ALTER TABLE `collaboration` ADD `tagsetTemplateSetId` char(36) NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `tagset` ADD CONSTRAINT `FK_7ab35130cde781b69259eec7d85` FOREIGN KEY (`tagsetTemplateId`) REFERENCES `tagset_template`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset_template` ADD CONSTRAINT `FK_9ad35130cde781b69259eec7d85` FOREIGN KEY (`tagsetTemplateSetId`) REFERENCES `tagset_template_set`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `collaboration` ADD CONSTRAINT `FK_1a135130cde781b69259eec7d85` FOREIGN KEY (`tagsetTemplateSetId`) REFERENCES `tagset_template_set`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
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
    await this.addTagsetTemplateSetToEntity(queryRunner, 'collaboration');

    // Add display location tagset to each of the spaces
    const spaces: { id: string; collaborationId: string }[] =
      await queryRunner.query(`SELECT id, collaborationId FROM space`);
    for (const space of spaces) {
      await this.addTagsetTemplateToCollaboration(
        queryRunner,
        space.collaborationId,
        TagsetReservedName.DISPLAY_LOCATION_SPACE,
        Object.values(SpaceDisplayLocation),
        SpaceDisplayLocation.KNOWEDGE_RIGHT
      );
    }

    // Add display location tagset to each of the spaces
    const challenges: { id: string; collaborationId: string }[] =
      await queryRunner.query(`SELECT id, collaborationId FROM challenge`);
    for (const challenge of challenges) {
      await this.addTagsetTemplateToCollaboration(
        queryRunner,
        challenge.collaborationId,
        TagsetReservedName.STATES,
        Object.values(InnovationFlowStates),
        InnovationFlowStates.NEW
      );
      await this.addTagsetTemplateToCollaboration(
        queryRunner,
        challenge.collaborationId,
        TagsetReservedName.DISPLAY_LOCATION_CHALLENGE,
        Object.values(ChallengeDisplayLocation),
        ChallengeDisplayLocation.CONTRIBUTE_RIGHT
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
    // collaboration ==> tagset_template_set
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_1a135130cde781b69259eec7d85\``
    );

    await queryRunner.query(
      'ALTER TABLE `collaboration` DROP COLUMN `tagsetTemplateSetId`'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` DROP COLUMN `tagsetTemplateId`'
    );
    await queryRunner.query('ALTER TABLE `tagset` DROP COLUMN `type`');
    await queryRunner.query('DROP TABLE `tagset_template_set`');
    await queryRunner.query('DROP TABLE `tagset_template`');
  }

  private async addTagsetTemplateToCollaboration(
    queryRunner: QueryRunner,
    collaborationID: string,
    tagsetTemplateName: string,
    tagsetTemplateAllowedValues: string[],
    tagsetTemplateDefaultSelectedValue: string
  ) {
    const collaborations: { id: string; tagsetTemplateSetId: string }[] =
      await queryRunner.query(
        `SELECT id, tagsetTemplateSetId FROM collaboration WHERE (id = '${collaborationID}')`
      );
    const collaboration = collaborations[0];
    const callouts: { profileId: string; group: string }[] =
      await queryRunner.query(
        `SELECT callout.group, profileId FROM callout WHERE (collaborationId = '${collaboration.id}')`
      );
    const tagsetTemplateID = randomUUID();
    const allowedValues = JSON.stringify(tagsetTemplateAllowedValues);
    await queryRunner.query(`
          INSERT INTO tagset_template (id, createdDate, updatedDate, version, name, type, allowedValues, defaultSelectedValue, tagsetTemplateSetId)
                                VALUES ('${tagsetTemplateID}', NOW(), NOW(), 1,
                                '${tagsetTemplateName}',
                                'select-one',
                                '${allowedValues}',
                                '${tagsetTemplateDefaultSelectedValue}',
                                '${collaboration.tagsetTemplateSetId}'
                                )
          `);

    for (const callout of callouts) {
      const tagsetID = randomUUID();
      const tagsetAuthID = randomUUID();
      await queryRunner.query(`
                INSERT INTO authorization_policy (id, createdDate, updatedDate, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules)
                                  VALUES ('${tagsetAuthID}', NOW(), NOW(), 1, '', '', 0, '')
                `);
      const tags = JSON.stringify([callout.group]);
      await queryRunner.query(`
          INSERT INTO tagset (id, createdDate, updatedDate, version,
                               name, type, tagsetTemplateId, tags, profileId)
                          VALUES ('${tagsetID}', NOW(), NOW(), 1,
                                '${tagsetTemplateName}',
                                'select-one',
                                '${tagsetTemplateID}',
                                '${tags}',
                                '${callout.profileId}'
                                )
          `);
    }
  }

  private async addTagsetTemplateSetToEntity(
    queryRunner: QueryRunner,
    entityName: string
  ) {
    const entities: { id: string }[] = await queryRunner.query(
      `SELECT id FROM ${entityName}`
    );
    for (const entity of entities) {
      const entityID = randomUUID();
      await queryRunner.query(`
                INSERT INTO tagset_template_set (id, createdDate, updatedDate, version)
                                          VALUES ('${entityID}', NOW(), NOW(), 1)
                `);
      await queryRunner.query(
        `UPDATE ${entityName} SET tagsetTemplateSetId = '${entityID}' WHERE (id = '${entity.id}')`
      );
    }
  }
}

enum SpaceDisplayLocation {
  HOME_TOP = 'HOME_0',
  HOME_LEFT = 'HOME_1',
  HOME_RIGHT = 'HOME_2',
  COMMUNITY_LEFT = 'COMMUNITY_1',
  COMMUNITY_RIGHT = 'COMMUNITY_2',
  CHALLENGES_LEFT = 'CHALLENGES_1',
  CHALLENGES_RIGHT = 'CHALLENGES_2',
  KNOWEDGE_RIGHT = 'KNOWLEDGE',
}

enum ChallengeDisplayLocation {
  HOME_TOP = 'HOME_0',
  HOME_LEFT = 'HOME_1',
  HOME_RIGHT = 'HOME_2',
  CONTRIBUTE = 'CONTRIBUTE_1',
  CONTRIBUTE_RIGHT = 'CONTRIBUTE_2',
  OPPORTUNITIES_LEFT = 'OPPORTUNITIES_1',
  OPPORTUNITIES_RIGHT = 'OPPORTUNITIES_2',
  KNOWEDGE_RIGHT = 'KNOWLEDGE',
}

// This is just a placeholder, the actual setting of these values + the chosen state will
// need to be done in code
enum InnovationFlowStates {
  NEW = 'new',
  BEING_DEFINED = 'beingRefined',
  IN_PROGRESS = 'inProgress',
  DONE = 'done',
}

enum TagsetReservedName {
  DEFAULT = 'default',
  DISPLAY_LOCATION_SPACE = 'display-location-space',
  DISPLAY_LOCATION_CHALLENGE = 'display-location-challenge',
  STATES = 'states',
}

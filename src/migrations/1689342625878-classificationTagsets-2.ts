import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class classificationTagsets21689342625878 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    //cleanup
    // await queryRunner.query('ALTER TABLE `tagset` DROP COLUMN `type`');
    // await queryRunner.query('ALTER TABLE `tagset` DROP COLUMN `name`');

    // Add display location tagset to each of the spaces
    const challenges: {
      id: string;
      collaborationId: string;
      innovationFlowId: string;
    }[] = await queryRunner.query(
      `SELECT id, collaborationId, innovationFlowId FROM challenge`
    );
    for (const challenge of challenges) {
      await this.addInnovationFlowTagsetToCollaboration(
        queryRunner,
        challenge.collaborationId,
        TagsetReservedName.STATES,
        challenge.innovationFlowId
      );
    }

    const opportunities: {
      id: string;
      collaborationId: string;
      innovationFlowId: string;
    }[] = await queryRunner.query(
      `SELECT id, collaborationId, innovationFlowId FROM opportunity`
    );
    for (const opportunity of opportunities) {
      await this.addInnovationFlowTagsetToCollaboration(
        queryRunner,
        opportunity.collaborationId,
        TagsetReservedName.STATES,
        opportunity.innovationFlowId
      );
      await this.addTagsetTemplateToCollaboration(
        queryRunner,
        opportunity.collaborationId,
        TagsetReservedName.STATES,
        Object.values(InnovationFlowStates),
        InnovationFlowStates.NEW
      );
      await this.addTagsetTemplateToCollaboration(
        queryRunner,
        opportunity.collaborationId,
        TagsetReservedName.DISPLAY_LOCATION_OPPORTUNITY,
        Object.values(OpportunityDisplayLocation),
        OpportunityDisplayLocation.CONTRIBUTE_RIGHT
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `tagset` ADD `type` varchar(255) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` ADD `name` varchar(255) NULL'
    );
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
    const allowedValues = tagsetTemplateAllowedValues;
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
      let tags;
      if (tagsetTemplateName === TagsetReservedName.STATES) tags = 'new';
      else tags = callout.group;

      await queryRunner.query(`
            INSERT INTO tagset (id, createdDate, updatedDate, version,
                                  tagsetTemplateId, tags, profileId)
                            VALUES ('${tagsetID}', NOW(), NOW(), 1,
                                  '${tagsetTemplateID}',
                                  '${tags}',
                                  '${callout.profileId}'
                                  )
            `);
    }
  }

  private async addInnovationFlowTagsetToCollaboration(
    queryRunner: QueryRunner,
    collaborationID: string,
    tagsetTemplateName: string,
    innovationFlowId: string
  ) {
    const collaborations: { id: string; tagsetTemplateSetId: string }[] =
      await queryRunner.query(
        `SELECT id, tagsetTemplateSetId FROM collaboration WHERE (id = '${collaborationID}')`
      );
    const collaboration = collaborations[0];
    const innovationFlows: { profileId: string }[] = await queryRunner.query(
      `SELECT profileId FROM innovation_flow WHERE (id = '${innovationFlowId}')`
    );
    const innovationFlow = innovationFlows[0];

    const tagsetTemplates: any = await queryRunner.query(
      `SELECT id FROM tagset_template WHERE (tagsetTemplateSetId = '${collaboration.tagsetTemplateSetId}' AND name = '${tagsetTemplateName}' )`
    );

    if (tagsetTemplates.length === 0) {
      console.log(
        `Could not find tagset template for tagsetTemplateSetId '${collaboration.tagsetTemplateSetId}' AND name = '${tagsetTemplateName}' `
      );
      return;
    }
    const tagsetTemplateID = tagsetTemplates[0].id;
    const tagsetID = randomUUID();
    const tagsetAuthID = randomUUID();
    await queryRunner.query(`
                  INSERT INTO authorization_policy (id, createdDate, updatedDate, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules)
                                    VALUES ('${tagsetAuthID}', NOW(), NOW(), 1, '', '', 0, '')
                  `);
    await queryRunner.query(`
            INSERT INTO tagset (id, createdDate, updatedDate, version,
                                   tagsetTemplateId, tags, profileId)
                            VALUES ('${tagsetID}', NOW(), NOW(), 1,
                                  '${tagsetTemplateID}',
                                  'new',
                                  '${innovationFlow.profileId}'
                                  )
            `);
  }
}

enum OpportunityDisplayLocation {
  HOME_TOP = 'HOME_0',
  HOME_LEFT = 'HOME_1',
  HOME_RIGHT = 'HOME_2',
  CONTRIBUTE = 'CONTRIBUTE_1',
  CONTRIBUTE_RIGHT = 'CONTRIBUTE_2',
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
  DISPLAY_LOCATION_OPPORTUNITY = 'display-location-opportunity',
  STATES = 'flow-state',
}

import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class oppFlowStateFix1689848195993 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
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
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

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
            INSERT INTO tagset (id, authorizationId, createdDate, updatedDate, version,
                                    name, type, tagsetTemplateId, tags, profileId)
                            VALUES ('${tagsetID}', '${tagsetAuthID}', NOW(), NOW(), 1,
                                  '${tagsetTemplateName}',
                                  'select-one',
                                  '${tagsetTemplateID}',
                                  'new',
                                  '${innovationFlow.profileId}'
                                  )
            `);
  }
}

enum TagsetReservedName {
  DEFAULT = 'default',
  DISPLAY_LOCATION_SPACE = 'display-location-space',
  DISPLAY_LOCATION_CHALLENGE = 'display-location-challenge',
  DISPLAY_LOCATION_OPPORTUNITY = 'display-location-opportunity',
  STATES = 'flow-state',
}

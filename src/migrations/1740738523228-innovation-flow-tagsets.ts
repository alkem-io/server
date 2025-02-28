import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InnovationFlowTagsets1740738523228 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * Get all L0 spaces and their innovation flow states and the current state.
     * Current state is a stored in a tagset linked to the profile of the innovation flow.
     * That tagset is named 'flow-state'.
     * And by the time of writing this migration, there are some innovation-flows that don't have that tagset, so create it if missing
     */
    const spaces: {
      spaceId: string;
      innovationFlowId: string;
      calloutsSetId: string;
      tagsetTemplateSetId: string;
      innovationFlowProfileId: string;
      innovationFlowStates: Array<{ displayName: string; description: string }>; // json
      tagsetId: string | undefined;
      currentState: string | undefined;
      tagsetTemplateId: string | undefined;
    }[] = await queryRunner.query(
      `SELECT
          space.id as spaceId,
          collaboration.innovationFlowId as innovationFlowId,
          collaboration.calloutsSetId as calloutsSetId,
          callouts_set.tagsetTemplateSetId as tagsetTemplateSetId,
          innovation_flow.profileId as innovationFlowProfileId,
          innovation_flow.states as innovationFlowStates,
          tagset.id as tagsetId,
          tagset.tags as currentState,
          tagset.tagsetTemplateId as tagsetTemplateId
        FROM space
          LEFT JOIN collaboration ON space.collaborationId = collaboration.id
          LEFT JOIN callouts_set ON collaboration.calloutsSetId = callouts_set.id
          LEFT JOIN innovation_flow ON innovation_flow.id = collaboration.innovationFlowId
          LEFT JOIN profile on innovation_flow.profileId = profile.id
          LEFT JOIN tagset on tagset.profileId = profile.id AND tagset.name = 'flow-state'
          LEFT JOIN tagset_template on tagset_template.id = tagset.tagsetTemplateId
        WHERE  space.level = '0';
      `
    );
    for (const space of spaces) {
      if (!space.innovationFlowId) {
        throw new Error(
          `Space ${space.spaceId} does not have an innovation flow.`
        );
      }
      const validStates = space.innovationFlowStates
        .map(state => state.displayName)
        .join(',');
      const firstState = space.innovationFlowStates[0].displayName;

      if (space.tagsetId) {
        // Make sure current state is a valid state
        if (
          space.innovationFlowStates.find(
            state => state.displayName === space.currentState
          )
        ) {
          console.log(
            `✓ Space ${space.spaceId} has a valid current state: ${space.currentState}`
          );
        } else {
          console.log(
            `✗ Space ${space.spaceId} doesn't have a valid current state: '${space.currentState}' resetting it...`
          );
          await queryRunner.query(
            `UPDATE tagset SET tags = '${firstState}' WHERE id = '${space.tagsetId}'`
          );
          console.log(`> Space ${space.spaceId} state set to: ${firstState}`);
        }

        if (!space.tagsetTemplateId) {
          throw new Error(
            `Tagset '${space.tagsetId}', doesn't have a tagsetTemplate. '${space.tagsetTemplateId}'`
          );
        }
        await this.verifyTagsetTemplate(
          queryRunner,
          space.tagsetTemplateId,
          validStates,
          firstState
        );
      } else {
        // Create a tagset when it's not present (bad data)
        await this.createTagset(
          queryRunner,
          space.innovationFlowProfileId,
          space.tagsetTemplateSetId,
          validStates,
          firstState
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async verifyTagsetTemplate(
    queryRunner: QueryRunner,
    tagsetTemplateId: string,
    validStates: string,
    defaultState: string
  ): Promise<void> {
    const [tagsetTemplate]: {
      name: string;
      type: string;
      tagsetTemplateSetId: string;
      allowedValues: string;
      defaultSelectedValue: string;
    }[] = await queryRunner.query(
      `SELECT name, type, allowedValues, defaultSelectedValue, tagsetTemplateSetId FROM tagset_template WHERE id = '${tagsetTemplateId}'`
    );
    if (!tagsetTemplate) {
      throw new Error(`Tagset template not found for tagset.`);
    }
    if (tagsetTemplate.name !== 'flow-state') {
      throw new Error(`Tagset template name is not 'flow-state'`);
    }
    if (tagsetTemplate.type !== 'select-one') {
      throw new Error(`Tagset template type is not 'select-one'`);
    }
    if (tagsetTemplate.allowedValues !== validStates) {
      console.log(
        `  ✗ Tagset template ${tagsetTemplateId} allowed values are not the same as the valid states: '${tagsetTemplate.allowedValues}' !== '${validStates}' resetting it...`
      );
      await queryRunner.query(
        `UPDATE tagset_template SET allowedValues = '${validStates}' WHERE id = '${tagsetTemplateId}'`
      );
    }
    if (tagsetTemplate.defaultSelectedValue !== defaultState) {
      console.log(
        `  ✗ Tagset template ${tagsetTemplateId} default value is not the same: '${tagsetTemplate.defaultSelectedValue}' !== '${defaultState}' resetting it...`
      );
      await queryRunner.query(
        `UPDATE tagset_template SET defaultSelectedValue = '${defaultState}' WHERE id = '${tagsetTemplateId}'`
      );
    }
    console.log(`✓ Tagset template ${tagsetTemplateId} is valid.`);
  }

  private async createTagset(
    queryRunner: QueryRunner,
    profileId: string,
    tagsetTemplateSetId: string,
    allowedValues: string,
    defaultSelectedValue: string
  ): Promise<void> {
    const tagsetId = randomUUID();
    const tagsetTemplateId = await this.createTagsetTemplate(
      queryRunner,
      tagsetTemplateSetId,
      'flow-state',
      'select-one',
      allowedValues,
      defaultSelectedValue
    );

    const authorizationID = await this.createAuthorizationPolicy(
      queryRunner,
      'tagset'
    );
    await queryRunner.query(`INSERT INTO tagset (
                                  id,
                                  version,
                                  name,
                                  tags,
                                  authorizationId,
                                  profileId,
                                  tagsetTemplateId,
                                  type
                            ) VALUES
                          (
                          '${tagsetId}',
                          1,
                          'flow-state',
                          '${defaultSelectedValue}',
                          '${authorizationID}',
                          '${profileId}',
                          '${tagsetTemplateId}',
                          'select-one'
                          )`);
  }

  private async createAuthorizationPolicy(
    queryRunner: QueryRunner,
    policyType: string
  ): Promise<string> {
    const authID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, privilegeRules, type) VALUES
                          ('${authID}',
                          1, '[]', '[]', '[]', '${policyType}')`
    );
    return authID;
  }

  private async createTagsetTemplate(
    queryRunner: QueryRunner,
    tagsetTemplateSetId: string,
    name: string,
    type: string,
    allowedValues: string,
    defaultSelectedValue: string
  ): Promise<string> {
    const tagsetTemplateId = randomUUID();
    await queryRunner.query(`INSERT INTO tagset_template (
                                  id,
                                  version,
                                  tagsetTemplateSetId,
                                  name,
                                  type,
                                  allowedValues,
                                  defaultSelectedValue) VALUES
                          (
                          '${tagsetTemplateId}',
                          1,
                          '${tagsetTemplateSetId}',
                          '${name}',
                          '${type}',
                          '${allowedValues}',
                          '${defaultSelectedValue}'
                          )`);
    return tagsetTemplateId;
  }
}

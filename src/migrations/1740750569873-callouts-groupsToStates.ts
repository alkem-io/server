import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CalloutsGroupsToStates1740750569873 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * Get all the callouts from L0 Spaces
     * and make sure they are in a valid flow-state
     */
    const callouts: {
      calloutId: string;
      calloutProfileId: string;
      tagsetTemplateSetId: string;
      innovationFlowProfileId: string;
      innovationFlowStates: Array<{ displayName: string; description: string }>; // json
    }[] = await queryRunner.query(
      `SELECT
        callout.id as calloutId,
        callout_framing.profileId as calloutProfileId,
        callouts_set.tagsetTemplateSetId as tagsetTemplateSetId,
        innovation_flow.profileId as innovationFlowProfileId,
        innovation_flow.states as innovationFlowStates
      FROM space
        JOIN collaboration ON space.collaborationId = collaboration.id
        JOIN innovation_flow ON innovation_flow.id = collaboration.innovationFlowId
        JOIN callouts_set ON collaboration.calloutsSetId = callouts_set.id
        JOIN callout ON callout.calloutsSetId = callouts_set.id
        JOIN callout_framing ON callout.framingId = callout_framing.id
      WHERE space.level = 0
    `
    );
    for (const callout of callouts) {
      console.log(
        `Checking callout ${callout.calloutId} with profile ${callout.calloutProfileId}`
      );
      const validStates = this.ensureValidStates(callout.innovationFlowStates);
      const firstState = callout.innovationFlowStates[0].displayName;

      const flowStateName = await this.getCalloutStateFromGroupTagset(
        queryRunner,
        callout.calloutId,
        callout.calloutProfileId,
        validStates
      );

      this.setCalloutState(
        queryRunner,
        callout,
        flowStateName,
        validStates,
        firstState
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async setCalloutState(
    queryRunner: QueryRunner,
    callout: {
      calloutId: string;
      calloutProfileId: string;
      tagsetTemplateSetId: string;
    },
    calloutState: string,
    validStates: string[],
    firstState: string
  ) {
    const [tagset]: { id: string; tags: string }[] = await queryRunner.query(
      `SELECT id, tags
        FROM tagset WHERE profileId = '${callout.calloutProfileId}' AND name = 'flow-state'`
    );
    if (tagset && tagset.id) {
      // Callout already has a tagset for flow-state
      console.log(
        `Callout ${callout.calloutId} has a flow-state tagset:'tagset.id'. Current value is '${tagset.tags}'`
      );
      await queryRunner.query(
        `UPDATE tagset SET tags = '${calloutState}' WHERE id = '${tagset.id}'`
      );
    } else {
      // Create flow-state tagset for this callout:
      console.log(
        `Callout ${callout.calloutId} doesn't have a flow-state tagset`
      );
      await this.createTagset(
        queryRunner,
        callout.calloutProfileId,
        callout.tagsetTemplateSetId,
        validStates.join(','),
        calloutState,
        firstState
      );
    }
  }

  private ensureValidStates(
    states: Array<{ displayName: string; description: string }>
  ): string[] {
    const result = states.map(state => state.displayName);
    if (result.length !== 4 || result.find(state => !state)) {
      throw new Error('Flow has invalid states!');
    }
    return result;
  }

  private async getCalloutStateFromGroupTagset(
    queryRunner: QueryRunner,
    calloutId: string,
    calloutProfileId: string,
    validStates: string[]
  ): Promise<string> {
    const [calloutGroup]: {
      tags: string;
    }[] = await queryRunner.query(
      `SELECT tags
      FROM
        tagset WHERE profileId = '${calloutProfileId}' AND name = 'callout-group'`
    );

    if (!calloutGroup) {
      throw new Error(`Callout group not found for callout ${calloutId}`);
    }
    switch (calloutGroup.tags) {
      case 'HOME':
        return validStates[0];
      case 'COMMUNITY':
        return validStates[1];
      case 'SUBSPACES':
        return validStates[2];
      case 'KNOWLEDGE':
        return validStates[3];
      default: {
        throw new Error(`Invalid callout group for callout ${calloutId}`);
      }
    }
  }

  private async createTagset(
    queryRunner: QueryRunner,
    profileId: string,
    tagsetTemplateSetId: string,
    allowedValues: string,
    selectedValue: string,
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
                          '${selectedValue}',
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

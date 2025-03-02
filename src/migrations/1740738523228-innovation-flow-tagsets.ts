import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InnovationFlowTagsets1740738523228 implements MigrationInterface {
  private TAGSET_GROUP = 'callout-group';
  private TAGSET_FLOW = 'flow-state';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD \`currentState\` json NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD \`flowStatesTagsetTemplateId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD UNIQUE INDEX \`IDX_858fd06a671b804765d91251e6\` (\`flowStatesTagsetTemplateId\`)`
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_858fd06a671b804765d91251e6\` ON \`innovation_flow\` (\`flowStatesTagsetTemplateId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD CONSTRAINT \`FK_858fd06a671b804765d91251e6c\` FOREIGN KEY (\`flowStatesTagsetTemplateId\`) REFERENCES \`tagset_template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `CREATE TABLE \`classification\` (\`id\` char(36) NOT NULL,
                                        \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                        \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                        \`version\` int NOT NULL,
                                        \`authorizationId\` char(36) NULL,
                                        UNIQUE INDEX \`REL_42422fc4b9dfe4424046f12d8f\` (\`authorizationId\`),
                                        PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`callouts_set\` DROP COLUMN \`groups\``
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` ADD \`classificationId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`classificationId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD UNIQUE INDEX \`IDX_0674c137336c2417df036053b6\` (\`classificationId\`)`
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_0674c137336c2417df036053b6\` ON \`callout\` (\`classificationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`classification\` ADD CONSTRAINT \`FK_42422fc4b9dfe4424046f12d8fd\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` ADD CONSTRAINT \`FK_391d124a58a845b85a047acc9d3\` FOREIGN KEY (\`classificationId\`) REFERENCES \`classification\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_0674c137336c2417df036053b65\` FOREIGN KEY (\`classificationId\`) REFERENCES \`classification\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Add a Classification entity to all callouts. This will hold any tagsets for classification.
    // NOTE: need to do this separately from CalloutsSet as have Callouts in Templates
    const callouts: {
      id: string;
    }[] = await queryRunner.query(`SELECT id FROM \`callout\``);
    for (const callout of callouts) {
      const classificationID =
        await this.createEmptyClassification(queryRunner);
      // Update callout to have the classification
      await queryRunner.query(
        `UPDATE callout SET classificationId = '${classificationID}' WHERE id = '${callout.id}'`
      );
    }

    // Migrate all innovation flows to have the current state and the flow states tagset
    await this.updateInnovationFlows(queryRunner);

    await this.moveClassificationTagsets(queryRunner);

    // Now have the data in the new setup, convert the L0 callouts to use the new flow states
    await this.setFlowStateOnLevelZeroCallouts(queryRunner);

    // Finally, delete all tagset templates and tagsets for the groups
    await queryRunner.query(
      `DELETE FROM tagset WHERE name = '${this.TAGSET_GROUP}'`
    );
    await queryRunner.query(
      `DELETE FROM tagset_template WHERE name = '${this.TAGSET_GROUP}'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('No down migration supported');
  }

  private async moveClassificationTagsets(queryRunner: QueryRunner) {
    // Migrate the classification tagsets to a new Classification entity, from framing
    // Note: needs to be over all CalloutsSets as this there are tagsets on KnowledgeBase callouts
    const calloutsSets: {
      id: string;
      tagsetTemplateSetId: string;
    }[] = await queryRunner.query(
      `SELECT id, tagsetTemplateSetId FROM \`callouts_set\``
    );
    for (const calloutsSet of calloutsSets) {
      const callouts: {
        id: string;
        calloutClassificationId: string;
        flowTagsetId: string;
        groupTagsetId: string;
      }[] = await queryRunner.query(
        `SELECT
            callout.id AS id,
            callout.classificationId AS calloutClassificationId,
            flowTagset.id AS flowTagsetId,
            groupTagset.id AS groupTagsetId
          FROM callout
            LEFT JOIN callout_framing ON callout.framingId = callout_framing.id
            LEFT JOIN profile ON callout_framing.profileId = profile.id
            LEFT JOIN tagset AS flowTagset ON flowTagset.profileId = profile.id AND flowTagset.name = '${this.TAGSET_FLOW}'
            LEFT JOIN tagset AS groupTagset ON groupTagset.profileId = profile.id AND groupTagset.name = '${this.TAGSET_GROUP}'
          WHERE callout.calloutsSetId = '${calloutsSet.id}';
        `
      );

      // Move the tagsets to the new classification
      for (const callout of callouts) {
        if (callout.flowTagsetId) {
          await queryRunner.query(
            `UPDATE tagset SET classificationId = '${callout.calloutClassificationId}', profileId=null WHERE id = '${callout.flowTagsetId}'`
          );
        }
        if (callout.groupTagsetId) {
          await queryRunner.query(
            `UPDATE tagset SET classificationId = '${callout.calloutClassificationId}',profileId=null WHERE id = '${callout.groupTagsetId}'`
          );
        }
      }
    }
  }

  private async setFlowStateOnLevelZeroCallouts(queryRunner: QueryRunner) {
    const spaceLevelZeroCalloutsSets: {
      id: string;
    }[] = await queryRunner.query(
      `SELECT
        callouts_set.id as id
      FROM space
        JOIN collaboration ON space.collaborationId = collaboration.id
        JOIN callouts_set ON collaboration.calloutsSetId = callouts_set.id
      WHERE space.level = '0'
      `
    );
    const calloutsSetIds = spaceLevelZeroCalloutsSets.map(
      calloutsSet => calloutsSet.id
    );
    console.log(
      `Found ${calloutsSetIds.length} callouts sets to update: ${JSON.stringify(calloutsSetIds)}`
    );

    const callouts: {
      id: string;
      groupTags: string;
      flowTagsetId: string;
    }[] = await queryRunner.query(
      `SELECT
        callout.id as id,
        groupTagset.tags as groupTags,
        flowTagset.id as flowTagsetId
      FROM callout
        JOIN classification ON callout.classificationId = classification.id
        JOIN tagset AS flowTagset on flowTagset.classificationId = classification.id AND flowTagset.name = '${this.TAGSET_FLOW}'
        JOIN tagset AS groupTagset on groupTagset.classificationId = classification.id AND groupTagset.name = '${this.TAGSET_GROUP}'
      WHERE callout.calloutsSetId IN ('${calloutsSetIds.join(',')}')
      `
    );

    console.log(
      `Found ${callouts.length} callouts  to update: ${JSON.stringify(callouts)}`
    );

    for (const callout of callouts) {
      const flowStateName = this.getCalloutStateFromGroupTags(
        callout.id,
        callout.groupTags
      );

      await queryRunner.query(
        `UPDATE tagset SET tags = '${flowStateName}' WHERE id = '${callout.flowTagsetId}'`
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

  private async ensureTagsetTemplateSetHasFlowState(
    queryRunner: QueryRunner,
    tagsetTemplateSetId: string
  ): Promise<string> {
    const [flowStateTagsetTemplate]: {
      id: string;
    }[] = await queryRunner.query(
      `SELECT id FROM tagset_template WHERE tagsetTemplateSet = ? AND name = ?`,
      [tagsetTemplateSetId, this.TAGSET_FLOW]
    );
    if (flowStateTagsetTemplate) {
      return flowStateTagsetTemplate.id;
    }

    console.log(
      `Unable to determine flow states tagsetTemplate for tagsetTemplateSet ${tagsetTemplateSetId}, creating it...`
    );
    return await this.createTagsetTemplate(
      queryRunner,
      tagsetTemplateSetId,
      this.TAGSET_FLOW,
      'select-one',
      '',
      ''
    );
  }

  private getCalloutStateFromGroupTags(
    calloutId: string,
    calloutGroupTags: string
  ): string {
    const validStates = ['Home', 'Community', 'Subspaces', 'Knowledge'];
    switch (calloutGroupTags) {
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

  private async updateInnovationFlows(queryRunner: QueryRunner): Promise<void> {
    /**
     * Get all Collaboration and their innovation flow states and the current state.
     * Current state is a stored in a tagset linked to the profile of the innovation flow.
     * That tagset is named 'flow-state'.
     * And by the time of writing this migration, there are some innovation-flows that don't have that tagset, so create it if missing
     */
    const collaborations: {
      collaborationId: string;
      innovationFlowId: string;
      calloutsSetId: string;
      tagsetTemplateSetId: string;
      innovationFlowProfileId: string;
      innovationFlowStates: Array<{ displayName: string; description: string }>; // JSON
      innovationFlowTagsetId: string | undefined;
      flowSelectedValue: string | undefined;
      flowTagsetTemplateId: string | undefined;
    }[] = await queryRunner.query(
      `SELECT
          collaboration.id AS collaborationId,
          collaboration.innovationFlowId AS innovationFlowId,
          collaboration.calloutsSetId AS calloutsSetId,
          callouts_set.tagsetTemplateSetId AS tagsetTemplateSetId,
          innovation_flow.profileId AS innovationFlowProfileId,
          innovation_flow.states AS innovationFlowStates,
          flowTagset.id AS innovationFlowTagsetId,
          flowTagset.tags AS flowSelectedValue,
          flowTagsetTemplate.id AS flowTagsetTemplateId
        FROM collaboration
        LEFT JOIN callouts_set ON collaboration.calloutsSetId = callouts_set.id
        LEFT JOIN innovation_flow ON innovation_flow.id = collaboration.innovationFlowId
        LEFT JOIN profile ON innovation_flow.profileId = profile.id
        LEFT JOIN tagset AS flowTagset ON flowTagset.profileId = profile.id AND flowTagset.name = '${this.TAGSET_FLOW}'
        LEFT JOIN tagset_template AS flowTagsetTemplate ON flowTagsetTemplate.tagsetTemplateSetId = callouts_set.tagsetTemplateSetId
            AND flowTagsetTemplate.name = '${this.TAGSET_FLOW}'
      `
    );
    for (const collaboration of collaborations) {
      if (
        !collaboration.innovationFlowId ||
        collaboration.innovationFlowStates.length === 0
      ) {
        throw new Error(
          `Space ${collaboration.collaborationId} does not have an innovation flow, or an empty flow states`
        );
      }

      let currentState = collaboration.innovationFlowStates[0];
      let flowStatesTagsetTemplateId = collaboration.flowTagsetTemplateId;

      if (collaboration.innovationFlowTagsetId) {
        // Make sure current state is a valid state
        const existingState = collaboration.innovationFlowStates.find(
          state => state.displayName === collaboration.flowSelectedValue
        );
        if (existingState) {
          console.log(
            `✓ Collaboration ${collaboration.collaborationId} has a valid current state: ${collaboration.flowSelectedValue}`
          );
          currentState = existingState;
        } else {
          console.log(
            `✗ Space ${collaboration.collaborationId} doesn't have a valid current state: '${collaboration.flowSelectedValue}' defaulting to first state...`
          );
        }
      }

      const validStateNames = collaboration.innovationFlowStates
        .map(state => state.displayName)
        .join(',');

      if (!flowStatesTagsetTemplateId) {
        const [tagsetTemplate]: {
          id: string;
          description: string;
        }[] = await queryRunner.query(
          `SELECT id FROM tagset_template WHERE tagsetTemplateSet = ? AND name = ?`,
          [collaboration.tagsetTemplateSetId, 'flow-state']
        );
        if (tagsetTemplate) {
          flowStatesTagsetTemplateId = tagsetTemplate.id;
        } else {
          throw new Error(`Unable to determine flow states tagsetTemplate`);
        }
      }
      if (!flowStatesTagsetTemplateId) {
        throw new Error(`Unable to determine flow states tagsetTemplate`);
      }
      await this.verifyTagsetTemplate(
        queryRunner,
        flowStatesTagsetTemplateId,
        validStateNames,
        currentState.displayName
      );
      // store the current state + flow states into the innovationFlow
      await queryRunner.query(
        `UPDATE innovation_flow SET currentState = '${JSON.stringify(currentState)}', flowStatesTagsetTemplateId = '${flowStatesTagsetTemplateId}' WHERE id = '${collaboration.innovationFlowId}'`
      );
      // And finally delete the tagset as no longer used
      await queryRunner.query(
        `DELETE FROM tagset WHERE id = '${collaboration.innovationFlowTagsetId}'`
      );
    }
  }

  private async createEmptyClassification(
    queryRunner: QueryRunner
  ): Promise<string> {
    const classificationId = randomUUID();
    const authorizationID = await this.createAuthorizationPolicy(
      queryRunner,
      'classification'
    );
    await queryRunner.query(`INSERT INTO classification (
                                  id,
                                  version,
                                  authorizationId
                            ) VALUES
                          (
                          '${classificationId}',
                          1,
                          '${authorizationID}'
                          )`);
    return classificationId;
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
}

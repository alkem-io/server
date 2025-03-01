import { MigrationInterface, QueryRunner } from 'typeorm';

export class InnovationFlowTagsets1740738523228 implements MigrationInterface {
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

    /**
     * Get all L0 spaces and their innovation flow states and the current state.
     * Current state is a stored in a tagset linked to the profile of the innovation flow.
     * That tagset is named 'flow-state'.
     * And by the time of writing this migration, there are some innovation-flows that don't have that tagset, so create it if missing
     */
    const collaborations: {
      collaborationId: string;
      innovationFlowId: string;
      calloutsSetId: string;
      isTemplate: boolean;
      tagsetTemplateSetId: string;
      innovationFlowProfileId: string;
      innovationFlowStates: Array<{ displayName: string; description: string }>; // json
      innovationFlowTagsetId: string | undefined;
      flowCurrentState: string | undefined;
      flowTagsetTemplateId: string | undefined;
    }[] = await queryRunner.query(
      `SELECT
          collaboration.id as collaborationId,
          collaboration.innovationFlowId as innovationFlowId,
          collaboration.calloutsSetId as calloutsSetId,
          collaboration.isTemplate as isTemplate,
          calloutsSet.tagsetTemplateSetId as tagsetTemplateSetId,
          innovationFlow.profileId as innovationFlowProfileId,
          innovationFlow.states as innovationFlowStates,
          flowTagset.id as innovationFlowTagsetId,
          flowTagset.tags as currentState,
          flowTagsetTemplate.id as flowTagsetTemplateId,
        FROM collaboration
          LEFT JOIN calloutsSet ON collaboration.calloutsSetId = callouts_set.id
          LEFT JOIN innovationFlow ON innovation_flow.id = collaboration.innovationFlowId
          LEFT JOIN profile on innovationFlow.profileId = profile.id
          LEFT JOIN flowTagset on tagset.profileId = profile.id AND tagset.name = 'flow-state'
          LEFT JOIN flowTagsetTemplate on tagset_template.tagsetTemplateSetId = calloutsSet.tagsetTemplateSetId AND tagset_template.name = 'flow-state'
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
          state => state.displayName === collaboration.flowCurrentState
        );
        if (existingState) {
          console.log(
            `✓ Collaboration ${collaboration.collaborationId} has a valid current state: ${collaboration.flowCurrentState}`
          );
          currentState = existingState;
        } else {
          console.log(
            `✗ Space ${collaboration.collaborationId} doesn't have a valid current state: '${collaboration.flowCurrentState}' defaulting to first state...`
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
          // TODO: error or create?
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

      // TODO: what to do with the group functionality which is then no longer used?
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('No down migration supported');
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

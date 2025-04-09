import { InnovationFlowResolverFields } from '@domain/collaboration/innovation-flow/innovation.flow.resolver.fields';
import { query } from 'express';
import { MigrationInterface, QueryRunner } from 'typeorm';

type InnovationFlow = {
  id: string;
  states: { displayName: string; description: string }[];
  currentState: { displayName: string; description: string };
  flowStatesTagsetTemplateId: string;
};

type TagsetTemplate = {
  id: string;
  name: string;
  type: string;
  allowedValues: string;
  defaultSelectedValue: string;
  tagsetTemplateSetId: string;
};

type Tagset = {
  id: string;
  name: string;
  tags: string;
  tagsetTemplateId: string;
  authorizationId: string;
};

export class ClassificationTagsetDuplication1743965565670
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get all the collaborations
    const collaborations: {
      id: string;
      calloutsSetId: string;
      innovationFlowId: string;
    }[] = await queryRunner.query(
      `SELECT id, calloutsSetId, innovationFlowId FROM \`collaboration\``
    );
    for (const collaboration of collaborations) {
      const { id, calloutsSetId, innovationFlowId } = collaboration;
      // Get the calloutsSet
      const [calloutsSet]: {
        id: string;
        tagsetTemplateSetId: string;
      }[] = await queryRunner.query(
        `SELECT id, tagsetTemplateSetId FROM \`callouts_set\` WHERE id = ?`,
        [calloutsSetId]
      );
      if (!calloutsSet) {
        console.warn(`Collaboration ${id} has no callouts set`);
        continue;
      }
      if (!calloutsSet.tagsetTemplateSetId) {
        console.warn(`CalloutsSet ${id} has no tagset template set`);
        continue;
      }
      const { tagsetTemplateSetId } = calloutsSet;

      // Get the innovationFlow
      const [innovationFlow]: InnovationFlow[] = await queryRunner.query(
        `SELECT id, states, currentState, flowStatesTagsetTemplateId FROM \`innovation_flow\` WHERE id = ?`,
        [innovationFlowId]
      );

      // Get the tagset templates of the calloutsSet
      const tagsetTemplates: TagsetTemplate[] = await queryRunner.query(
        `SELECT id,name, type, allowedValues, defaultSelectedValue, tagsetTemplateSetId FROM \`tagset_template\` WHERE tagsetTemplateSetId = ?`,
        [tagsetTemplateSetId]
      );

      const flowStateTagsetTemplate = await this.tagsetTemplatesCheck(
        queryRunner,
        innovationFlow,
        tagsetTemplateSetId,
        tagsetTemplates
      );
      const flowStateTagsetTemplateId = flowStateTagsetTemplate.id;
      const firstFlowState = innovationFlow.states[0].displayName;

      // First delete any classification tagset that are not the flow state tagset
      const callouts: {
        id: string;
        classificationId: string;
      }[] = await queryRunner.query(
        `SELECT id, classificationId FROM \`callout\` WHERE calloutsSetId = ?`,
        [calloutsSetId]
      );
      for (const callout of callouts) {
        const tagsets: Tagset[] = await queryRunner.query(
          `SELECT id, name, tags, tagsetTemplateId, authorizationId FROM \`tagset\` WHERE classificationId = ?`,
          [callout.classificationId]
        );
        if (tagsets.length > 1) {
          // Find the first tagset that matches, and delete the rest
          const tagsetToKeep = tagsets.find(
            tagset => tagset.tagsetTemplateId === flowStateTagsetTemplateId
          );
          if (!tagsetToKeep) {
            console.warn(
              `Unable to find tagset to keep for callout ${callout.id} in collaboration ${id}`
            );
            continue;
          }
          for (const tagset of tagsets) {
            if (tagset.id !== tagsetToKeep.id) {
              await this.deleteTagset(
                queryRunner,
                tagset.id,
                tagset.authorizationId
              );
            }
          }
          await this.verifyTagset(
            queryRunner,
            callout,
            tagsetToKeep,
            flowStateTagsetTemplate,
            firstFlowState
          );
        } else if (tagsets.length === 1) {
          const calloutTagset = tagsets[0];
          await this.verifyTagset(
            queryRunner,
            callout,
            tagsets[0],
            flowStateTagsetTemplate,
            firstFlowState
          );
        } else {
          console.warn(
            `No classification tagset found for callout ${callout.id} in collaboration ${id} ${tagsets.length}`
          );
        }
      }
    }

    // Delete unused classifications:
    const unusedClassifications: { id: string }[] = await queryRunner.query(`
        SELECT classification.id FROM classification
        LEFT JOIN callout ON classification.id = callout.classificationId
        WHERE callout.id IS NULL;
      `);
    for (const { id } of unusedClassifications) {
      await this.deleteClassification(queryRunner, id);
    }
  }
  private async verifyTagset(
    queryRunner: QueryRunner,
    callout: { id: string },
    tagset: Tagset,
    tagsetTemplate: TagsetTemplate,
    defaultState: string
  ): Promise<void> {
    if (tagset.tagsetTemplateId !== tagsetTemplate.id) {
      console.warn(
        `Tagset template is supposed to link template ${tagsetTemplate.id} but it's not ${tagset.tagsetTemplateId}`
      );
    }
    if (tagset.name !== 'flow-state') {
      console.warn(
        `Tagset name is supposed to be flow-state but it's not ${tagset.name}`
      );
    }
    if (!`,${tagsetTemplate.allowedValues},`.includes(`,${tagset.tags},`)) {
      console.warn(
        `Callout ${callout.id} is not in a valid tagset_template allowed value '${tagset.tags}':[${tagsetTemplate.allowedValues}]`
      );
      // This is not nice, we are going to move that callout to the if you want to analyze that
      // querying some debugging information:
      const calloutInfo = await queryRunner.query(
        `
        SELECT
          parentSpace2.nameId AS parent2SpaceNameId,
          parentSpace.nameId AS parentSpaceNameId,
          space.nameID AS spaceNameId,
          space.level AS spaceLevel,
          knowledge_base.id AS knowledgeBaseId,
          callout.nameId AS calloutNameId
        FROM callout
	          LEFT JOIN callouts_set ON callout.calloutsSetId = callouts_set.id
            LEFT JOIN knowledge_base ON knowledge_base.calloutsSetId = callouts_set.id
	          LEFT JOIN collaboration ON callouts_set.id = collaboration.calloutsSetId
	          LEFT JOIN space ON collaboration.id = space.collaborationId
            LEFT JOIN space AS parentSpace ON space.parentSpaceId = parentSpace.id
            LEFT JOIN space AS parentSpace2 ON parentSpace.parentSpaceId = parentSpace2.id
          WHERE callout.id = ?`,
        [callout.id]
      );
      console.warn(
        `PRODUCT PROBLEM: Callout ${callout.id} is going to be moved from  '${tagset.tags}' to '${defaultState}'`,
        calloutInfo
      );
      await queryRunner.query(
        `
        UPDATE \`tagset\` SET tags = ? WHERE id = ?
      `,
        [defaultState, tagset.id]
      );
    }
  }

  /**
   * returns the flowStateTagsetTemplateId
   * @param queryRunner
   * @param innovationFlow
   * @param tagsetTemplateSetId
   * @param tagsetTemplates
   */
  private async tagsetTemplatesCheck(
    queryRunner: QueryRunner,
    innovationFlow: InnovationFlow,
    tagsetTemplateSetId: string,
    tagsetTemplates: TagsetTemplate[]
  ): Promise<TagsetTemplate> {
    if (tagsetTemplates.length === 0) {
      // No tagset templates found, we'll need to create one:
      throw new Error('TagsetTemplateSet has no tagset templates');
    } else if (tagsetTemplates.length === 1) {
      if (tagsetTemplates[0].id !== innovationFlow.flowStatesTagsetTemplateId) {
        // The tagset template is not the one of the flow state
        throw new Error(
          'The tagset template id does not match the flow state tagset template id'
        );
      }
      return this.verifyFlowStateTagsetTemplate(
        queryRunner,
        tagsetTemplates[0],
        innovationFlow,
        tagsetTemplateSetId
      );
    } else if (tagsetTemplates.length > 1) {
      const tagsetTemplateToKeep = tagsetTemplates.find(
        tagsetTemplate =>
          tagsetTemplate.id === innovationFlow.flowStatesTagsetTemplateId
      );
      if (!tagsetTemplateToKeep) {
        throw new Error(
          'None of the tagsets_templates of the tagset_template_set match the flow tagset template'
        );
      }
      console.log(
        `Found ${tagsetTemplates.length} tagset templates, keeping ${tagsetTemplateToKeep.id}`
      );
      for (const tagsetTemplate of tagsetTemplates) {
        if (tagsetTemplate.id !== tagsetTemplateToKeep.id) {
          await this.deleteTagsetTemplate(queryRunner, tagsetTemplate.id);
        }
      }
      return this.verifyFlowStateTagsetTemplate(
        queryRunner,
        tagsetTemplateToKeep,
        innovationFlow,
        tagsetTemplateSetId
      );
    }
    throw new Error(
      `The calloutSet with tagsetTemplateSetId ${tagsetTemplateSetId} doesn't have any valid tagsetTemplate that matches the flow state tagsetTemplate ${innovationFlow.id}: ${innovationFlow.flowStatesTagsetTemplateId}`
    );
  }

  private async verifyFlowStateTagsetTemplate(
    queryRunner: QueryRunner,
    flowStateTagsetTemplate: TagsetTemplate,
    innovationFlow: InnovationFlow,
    tagsetTemplatesSetId: string
  ): Promise<TagsetTemplate> {
    if (flowStateTagsetTemplate.tagsetTemplateSetId !== tagsetTemplatesSetId) {
      throw new Error(
        `The tagset template ${flowStateTagsetTemplate.id} is not linked to the flow state tagset template id ${innovationFlow.flowStatesTagsetTemplateId}`
      );
    }
    if (flowStateTagsetTemplate.name !== 'flow-state') {
      throw new Error(
        `The tagset template ${flowStateTagsetTemplate.id} is not a flow-state tagset template`
      );
    }
    if (flowStateTagsetTemplate.type !== 'select-one') {
      throw new Error(
        `The tagset template ${flowStateTagsetTemplate.id} is not a flow-state tagset template`
      );
    }
    const allStates = innovationFlow.states.map(state => state.displayName);
    const allowedValues = allStates.join(',');
    if (flowStateTagsetTemplate.allowedValues !== allowedValues) {
      console.warn(
        `Allowed values doesn't match the flow states: ${flowStateTagsetTemplate.allowedValues} !== ${allowedValues} in innovationFlow ${innovationFlow.id}`
      );
      await queryRunner.query(
        `
        UPDATE \`tagset_template\` SET allowedValues = ? WHERE id = ?
      `,
        [allowedValues, flowStateTagsetTemplate.id]
      );
      flowStateTagsetTemplate.allowedValues = allowedValues;
    }
    if (!allStates.includes(flowStateTagsetTemplate.defaultSelectedValue)) {
      console.warn(
        `Default selected value doesn't match the flow states: ${flowStateTagsetTemplate.defaultSelectedValue} not in ${allowedValues} in innovationFlow ${innovationFlow.id}`
      );
      await queryRunner.query(
        `
        UPDATE \`tagset_template\` SET defaultSelectedValue = ? WHERE id = ?
      `,
        [allStates[0], flowStateTagsetTemplate.id]
      );
      flowStateTagsetTemplate.defaultSelectedValue = allStates[0];
    }
    return flowStateTagsetTemplate;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async deleteTagset(
    queryRunner: QueryRunner,
    tagsetId: string,
    authorizationId: string
  ) {
    // delete the tagset + authorization
    await queryRunner.query(
      `DELETE FROM \`authorization_policy\` WHERE id = ?`,
      [authorizationId]
    );
    // delete the tagset
    await queryRunner.query(`DELETE FROM \`tagset\` WHERE id = ?`, [tagsetId]);
  }

  private async deleteTagsetTemplate(
    queryRunner: QueryRunner,
    tagsetTemplateId: string
  ) {
    // Delete all tagsets linked to this template:
    const tagsets: {
      id: string;
      authorizationId: string;
    }[] = await queryRunner.query(
      `SELECT id, authorizationId FROM \`tagset\` WHERE tagsetTemplateId = ?`,
      [tagsetTemplateId]
    );
    for (const tagset of tagsets) {
      await this.deleteTagset(queryRunner, tagset.id, tagset.authorizationId);
    }

    // delete the tagset template
    await queryRunner.query(`DELETE FROM \`tagset_template\` WHERE id = ?`, [
      tagsetTemplateId,
    ]);
  }

  private async deleteClassification(
    queryRunner: QueryRunner,
    classificationId: string
  ) {
    const tagsets: { id: string; authorizationId: string }[] =
      await queryRunner.query(
        `SELECT id, authorizationId FROM \`tagset\` WHERE classificationId = ?`,
        [classificationId]
      );
    console.warn(
      `Deleting classification ${classificationId} with tagsets`,
      tagsets
    );
    // delete all tagsets linked to this classification
    for (const tagset of tagsets) {
      await this.deleteTagset(queryRunner, tagset.id, tagset.authorizationId);
    }

    // Get and delete the classification's authorization
    const [classification]: { authorizationId: string }[] =
      await queryRunner.query(
        `SELECT authorizationId FROM \`classification\` WHERE id = ?`,
        [classificationId]
      );

    if (classification?.authorizationId) {
      await queryRunner.query(
        `DELETE FROM \`authorization_policy\` WHERE id = ?`,
        [classification.authorizationId]
      );
    }

    // delete the classification
    await queryRunner.query(`DELETE FROM \`classification\` WHERE id = ?`, [
      classificationId,
    ]);
  }
}

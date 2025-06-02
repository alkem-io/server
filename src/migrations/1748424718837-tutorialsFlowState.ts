import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { bootstrapSpaceTutorialsCallouts } from '@core/bootstrap/platform-template-definitions/space-tutorials/bootstrap.space.tutorials.callouts';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class TutorialsFlowState1748424718837 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get the calloutsSetId from the collaboration associated with the platform space tutorials template
    const [collaboration]: { calloutsSetId: string }[] =
      await queryRunner.query(
        `SELECT calloutsSetId FROM collaboration WHERE id = (
          SELECT collaborationId FROM template WHERE id = (
            SELECT templateId FROM template_default WHERE templatesManagerId IN (
              SELECT templatesManagerId FROM platform
            ) AND type = 'platform-space-tutorials'
          )
        )`
      );
    if (!collaboration) {
      console.warn(
        'No collaboration found for platform space tutorials template. Skipping flow state updates.'
      );
      return;
    }
    const { calloutsSetId } = collaboration;

    // Get the callouts of the tutorial
    const callouts: {
      id: string;
      nameId: string;
      classificationTagsetId: string;
      currentFlowState: string;
      currentSortOrder: number;
    }[] = await queryRunner.query(
      `
          SELECT
            callout.id,
            callout.nameId,
            tagset.id AS classificationTagsetId,
            tagset.tags AS currentFlowState,
            callout.sortOrder as currentSortOrder
          FROM callout
            JOIN tagset ON tagset.classificationID = callout.classificationId AND tagset.name = 'flow-state'
          WHERE calloutsSetId = ?`,
      [calloutsSetId]
    );

    for (const callout of callouts) {
      // tutorialCallouts are the hardcoded callouts in the bootstrap file
      const tutorialCallout = this.findTutorialCallout(callout.nameId);
      if (!tutorialCallout) {
        console.warn(
          `No tutorial callout found for nameId: ${callout.nameId}. This callout will be skipped.`
        );
        continue;
      }
      const { flowState: expectedFlowState, sortOrder: expectedSortOrder } =
        tutorialCallout;

      if (callout.currentFlowState !== expectedFlowState) {
        console.log(
          `Updating flow state for callout: ${callout.id} ${callout.nameId} from ${callout.currentFlowState} to ${expectedFlowState}`
        );
        await queryRunner.query(
          `
          UPDATE tagset SET tags = ? WHERE id = ?
        `,
          [expectedFlowState, callout.classificationTagsetId]
        );
      }
      if (callout.currentSortOrder !== expectedSortOrder) {
        console.log(
          `Updating sortOrder for callout: ${callout.id} ${callout.nameId} from ${callout.currentSortOrder} to ${expectedSortOrder}`
        );
        await queryRunner.query(
          `
          UPDATE callout SET sortOrder = ? WHERE id = ?
        `,
          [expectedSortOrder, callout.id]
        );
      }
    }
  }

  // Get the tutorial callout from the hardcoded bootstrap file
  private findTutorialCallout(nameId: string) {
    const tutorialCallout = bootstrapSpaceTutorialsCallouts.find(
      c => c.nameID === nameId
    );
    if (!tutorialCallout) {
      return undefined;
    }
    const classificationTagset = tutorialCallout.classification?.tagsets.find(
      tagset => tagset.name === TagsetReservedName.FLOW_STATE
    );
    if (!classificationTagset) {
      // This should not happen, the tutorials are hardcoded in that file
      throw new Error(
        `No classification tagset found for tutorial callout: ${nameId}`
      );
    }
    const flowState = classificationTagset.tags?.[0];
    if (!flowState) {
      throw new Error(
        `No expected flow state found for tutorial callout: ${nameId}`
      );
    }

    return {
      flowState,
      sortOrder: tutorialCallout.sortOrder,
    };
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

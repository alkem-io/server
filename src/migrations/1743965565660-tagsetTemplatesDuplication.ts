import { InnovationFlowResolverFields } from '@domain/collaboration/innovation-flow/innovation.flow.resolver.fields';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class TagsetTemplatesDuplication1743965565660
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get all the collaborations that are not templates
    const collaborations: {
      id: string;
      calloutsSetId: string;
      innovationFlowId: string;
    }[] = await queryRunner.query(
      `SELECT id, calloutsSetId, innovationFlowId FROM \`collaboration\` WHERE isTemplate = 0`
    );
    for (const collaboration of collaborations) {
      const { id, calloutsSetId } = collaboration;
      // Get the calloutsSet
      const calloutsSet: {
        id: string;
        tagsetTemplateSetId: string;
      } = await queryRunner.query(
        `SELECT id, tagsetTemplateSetId FROM \`callouts_set\` WHERE id = ?`,
        [calloutsSetId]
      );
      if (!calloutsSet) {
        console.log(`Collaboration ${id} has no callouts set`);
        continue;
      }
      const { tagsetTemplateSetId } = calloutsSet;
      // Get the tagsetTemplatesSet
      const tagsetTemplatesSet: {
        id: string;
        tagsetTemplatesCount: number;
      } = await queryRunner.query(
        `SELECT id, COUNT(*) as tagsetTemplatesCount FROM \`tagset_template_set\` WHERE id = ?`,
        [tagsetTemplateSetId]
      );
      if (!tagsetTemplatesSet) {
        console.log(`CalloutSet ${id} has no tagset templates set`);
        continue;
      }
      if (tagsetTemplatesSet.tagsetTemplatesCount > 1) {
        const tagsetTemplates: {
          id: string;
          allowedValues: string;
        }[] = await queryRunner.query(
          `SELECT id, allowedValues FROM \`tagset_template\` WHERE tagsetTemplateSetId = ?`,
          [tagsetTemplatesSet.id]
        );
        // get the innovation flow tagsetTemplate and delete the other one
        const innovationFlow: {
          id: string;
          flowStatesTagsetTemplateId: string;
        } = await queryRunner.query(
          `SELECT id, flowStatesTagsetTemplateId FROM \`innovation_flow\` WHERE id = ?`,
          [collaboration.innovationFlowId]
        );
        if (!innovationFlow) {
          console.log(`Collaboration ${id} has no innovation flow`);
          continue;
        }
        const innovationFlowTagsetTemplateId =
          innovationFlow.flowStatesTagsetTemplateId;
        for (const tagsetTemplate of tagsetTemplates) {
          if (tagsetTemplate.id !== innovationFlowTagsetTemplateId) {
            // delete the tagsetTemplate
            await queryRunner.query(
              `DELETE FROM \`tagset_template\` WHERE id = ?`,
              [tagsetTemplate.id]
            );
          }
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

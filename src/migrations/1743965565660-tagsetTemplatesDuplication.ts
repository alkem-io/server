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

      const tagsetTemplates: {
        id: string;
      }[] = await queryRunner.query(
        `SELECT id FROM \`tagset_template\` WHERE tagsetTemplateSetId = ?`,
        [tagsetTemplateSetId]
      );
      if (tagsetTemplates.length > 1) {
        console.warn(
          `Identified tagsetTemplatesSet ${tagsetTemplateSetId} has ${tagsetTemplates.length} tagset templates`
        );

        // get the innovation flow tagsetTemplate and delete the other one
        const [innovationFlow]: {
          id: string;
          flowStatesTagsetTemplateId: string;
        }[] = await queryRunner.query(
          `SELECT id, flowStatesTagsetTemplateId FROM \`innovation_flow\` WHERE id = ?`,
          [collaboration.innovationFlowId]
        );
        if (!innovationFlow) {
          console.warn(`Collaboration ${id} has no innovation flow`);
          continue;
        }
        const flowStateTagsetTemplateId =
          innovationFlow.flowStatesTagsetTemplateId;
        if (!flowStateTagsetTemplateId) {
          console.warn(
            `Unable to find flow state tagset template for innovation flow ${innovationFlow.id}`
          );
          continue;
        }

        // First delete any classification tagset that are not the flow state tagset
        const callouts: {
          id: string;
          classificationId: string;
        }[] = await queryRunner.query(
          `SELECT id, classificationId FROM \`callout\` WHERE calloutsSetId = ?`,
          [calloutsSetId]
        );
        for (const callout of callouts) {
          const tagsets: {
            id: string;
            tagsetTemplateId: string;
            authorizationId: string;
          }[] = await queryRunner.query(
            `SELECT id, tagsetTemplateId FROM \`tagset\` WHERE classificationId = ?`,
            [callout.classificationId]
          );

          for (const tagset of tagsets) {
            if (tagset.tagsetTemplateId !== flowStateTagsetTemplateId) {
              // delete the tagset + authorization
              await queryRunner.query(
                `DELETE FROM \`authorization_policy\` WHERE id = ?`,
                [tagset.authorizationId]
              );
              // delete the tagset
              await queryRunner.query(`DELETE FROM \`tagset\` WHERE id = ?`, [
                tagset.id,
              ]);
            }
          }
        }

        // Now delete the tagset templates that are not the flow state tagset
        for (const tagsetTemplate of tagsetTemplates) {
          if (tagsetTemplate.id !== flowStateTagsetTemplateId) {
            // Check if any tagsets use this template
            const tagsets: {
              id: string;
              tagsetTemplateId: string;
            }[] = await queryRunner.query(
              `SELECT id, tagsetTemplateId FROM \`tagset\` WHERE tagsetTemplateId = ?`,
              [tagsetTemplate.id]
            );
            if (tagsets.length > 0) {
              // Expectation is that there are not any tagsets using the duplicate templates, which
              // are highly likely to be from the old group usage
              console.warn(
                `TagsetTemplate ${tagsetTemplate.id} is used by ${tagsets.length} tagsets; skipping deletion`
              );
              continue;
            }
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

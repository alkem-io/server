import { InnovationFlowResolverFields } from '@domain/collaboration/innovation-flow/innovation.flow.resolver.fields';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class ClassificationTagsetDuplication1743965565670
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
      if (tagsetTemplates.length !== 1) {
        console.warn(
          `Identified tagsetTemplatesSet ${tagsetTemplateSetId} without exactly one tagset templates`
        );
        continue;
      }
      const flowStateTagsetTemplateId = tagsetTemplates[0].id;

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
        } else {
          console.warn(
            `No classification tagset found for callout ${callout.id} in collaboration ${id}`
          );
        }
      }
    }
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
}

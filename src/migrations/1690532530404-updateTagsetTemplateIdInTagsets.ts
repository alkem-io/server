import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTagsetTemplateIdInTagsets1690532530404
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tagsets: { id: string; profileId: string }[] =
      await queryRunner.query(
        `SELECT id, profileId FROM tagset WHERE (name = '${CALLOUT_DISPLAY_LOCATION}' AND tagsetTemplateId IS NULL)`
      );
    for (const tagset of tagsets) {
      const [callout]: { id: string; collaborationId: string }[] =
        await queryRunner.query(
          `SELECT id, collaborationId FROM callout WHERE profileId = '${tagset.profileId}'`
        );
      if (!callout) continue;

      const [collaboration]: { id: string; tagsetTemplateSetId: string }[] =
        await queryRunner.query(
          `SELECT id, tagsetTemplateSetId FROM collaboration WHERE id = '${callout.collaborationId}'`
        );
      if (!collaboration) continue;

      const [tagsetTemplate]: { id: string }[] = await queryRunner.query(
        `SELECT id FROM tagset_template WHERE (tagsetTemplateSetId = '${collaboration.tagsetTemplateSetId}' AND name = '${CALLOUT_DISPLAY_LOCATION}')`
      );

      if (!tagsetTemplate) continue;
      await queryRunner.query(
        `UPDATE tagset SET tagsetTemplateId = '${tagsetTemplate.id}' WHERE id = '${tagset.id}'`
      );
    }

    await queryRunner.query(
      `UPDATE tagset SET type = 'select-one' WHERE \`name\` in ('callout-display-location', 'flow-state')`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

const CALLOUT_DISPLAY_LOCATION = 'callout-display-location';

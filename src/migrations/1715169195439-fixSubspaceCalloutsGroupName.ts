import { MigrationInterface, QueryRunner } from 'typeorm';

interface Tagset {
  id: string;
  tagsetTemplateId: string;
}

export class fixSubspaceCalloutsGroupName1715169195439
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 'callout-group' Tagsets from callouts in subspaces
    const tagsets: Tagset[] = await queryRunner.query(`
      SELECT id, tagsetTemplateId FROM tagset WHERE tagset.profileId IN (
        SELECT id FROM profile WHERE id IN (
          SELECT profileId FROM callout_framing WHERE id IN (
            SELECT framingId FROM callout WHERE collaborationId IN (
              SELECT collaborationId FROM space WHERE parentSpaceId IS NOT null	-- only subspaces
            )
          )
        )
      ) and tagset.name = 'callout-group';`);

    for (const tagset of tagsets) {
      const { id, tagsetTemplateId } = tagset;
      await queryRunner.query(
        `UPDATE tagset SET tags = 'HOME' WHERE id = '${id}';`
      );
      await queryRunner.query(
        `UPDATE tagset_template SET defaultSelectedValue = 'HOME', allowedValues = 'HOME' WHERE id = '${tagsetTemplateId}';`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

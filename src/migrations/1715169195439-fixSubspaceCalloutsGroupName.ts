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
      SELECT tagset.id, tagset.tagsetTemplateId FROM space
        INNER JOIN callout ON callout.collaborationId = space.collaborationId
          INNER JOIN callout_framing ON callout.framingId = callout_framing.id
          INNER JOIN tagset ON tagset.profileId = callout_framing.profileId
          INNER JOIN tagset_template ON tagset.tagsetTemplateId = tagset_template.id
      WHERE
        space.parentSpaceId IS NOT NULL       -- only subspaces
        AND tagset.name = 'callout-group'   -- callout-group tagsets
        AND (tagset.tags !='HOME' OR tagset_template.allowedValues != 'HOME' OR tagset_template.defaultSelectedValue != 'HOME')
  `);

    const tagsetIds = tagsets.map(tagset => `'${tagset.id}'`).join(',');
    const tagsetTemplateIds = tagsets
      .map(tagset => `'${tagset.tagsetTemplateId}'`)
      .join(',');

    if (tagsets.length > 0) {
      await queryRunner.query(
        `UPDATE tagset SET tags = 'HOME' WHERE id IN (${tagsetIds});`
      );
      await queryRunner.query(
        `UPDATE tagset_template SET defaultSelectedValue = 'HOME', allowedValues = 'HOME' WHERE id IN (${tagsetTemplateIds});`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

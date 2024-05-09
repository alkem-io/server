import { MigrationInterface, QueryRunner } from 'typeorm';

// move all the Callouts of all Subspaces ONLY, to HOME group
// Space Callouts are not moved; only Subspaces
export class moveCalloutsHome1714040354734 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // update the value of TAGSET related ONLY to Subspaces
    await queryRunner.query(`
        UPDATE tagset
        LEFT JOIN profile ON profile.id = tagset.profileId
        LEFT JOIN callout_framing ON callout_framing.profileId = profile.id
        LEFT JOIN callout ON callout.framingId = callout_framing.id
        LEFT JOIN collaboration ON collaboration.id = callout.collaborationId
        LEFT JOIN space ON space.collaborationId = collaboration.id
        SET tagset.tags = 'HOME'
        WHERE space.parentSpaceId IS NOT NULL AND tagset.name = 'callout-group';
      `);
    // update the value of TAGSET_TEMPLATE related ONLY to Subspaces
    await queryRunner.query(`
        UPDATE tagset_template
        LEFT JOIN tagset_template_set on tagset_template.tagsetTemplateSetId = tagset_template_set.id
        LEFT JOIN collaboration ON collaboration.tagsetTemplateSetId = tagset_template_set.id
        LEFT JOIN space ON space.collaborationId = collaboration.id
        SET tagset_template.allowedValues = 'HOME'
        WHERE space.parentSpaceId IS NOT NULL AND tagset_template.name = 'callout-group';
      `);
    // update the value of COLLABORATION related ONLY to Subspaces
    const newGroupStr = JSON.stringify([
      { displayName: 'HOME', description: 'The Home page.' },
    ]);
    await queryRunner.query(`
        UPDATE collaboration
        LEFT JOIN space ON space.collaborationId = collaboration.id
        SET collaboration.groupsStr = '${newGroupStr}'
        WHERE space.parentSpaceId IS NOT NULL;
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

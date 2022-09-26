import { MigrationInterface, QueryRunner } from 'typeorm';

export class activityParentID21664212708443 implements MigrationInterface {
  name = 'activityParentID21664212708443';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const activities: any[] = await queryRunner.query(
      `SELECT id, resourceID, parentID, type from activity`
    );
    for (const activity of activities) {
      if (activity.parentID) continue;
      let parentID = undefined;
      switch (activity.type) {
        case 'card-created':
        case 'card-comment':
          // set callout ID as parent ID
          const calloutsAspects = await queryRunner.query(
            `SELECT id, calloutId from aspect where id='${activity.resourceID}'`
          );
          parentID = calloutsAspects[0].calloutId;
          break;
        case 'canvas-created':
          const calloutsCanvases = await queryRunner.query(
            `SELECT id, calloutId from canvas where id='${activity.resourceID}'`
          );
          parentID = calloutsCanvases[0].calloutId;
          break;
      }

      await queryRunner.query(
        `UPDATE activity SET parentID= '${parentID}' WHERE id= '${activity.id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

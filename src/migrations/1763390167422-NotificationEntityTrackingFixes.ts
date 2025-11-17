import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationEntityTrackingFixes1763390167422
  implements MigrationInterface
{
  name = 'NotificationEntityTrackingFixes1763390167422';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // todo: how to delete notifications connected to deleted messages
    // target payload instead of notifications since the notifications are unified, and the problems that need fixing are
    //  ===== PLATFORM_FORUM_DISCUSSION =====
    // roomID to be payload.discussion.id
    // NOTE: '$.comment.id' does not exist at the point when the migration was ran, so we are not setting commentID here
    await queryRunner.query(`
      UPDATE in_app_notification
      SET roomID = JSON_UNQUOTE(JSON_EXTRACT(payload, '$.discussion.id'))
      WHERE JSON_EXTRACT(payload, '$.type') = 'PLATFORM_FORUM_DISCUSSION'
    `);
    // ===== VIRTUAL_CONTRIBUTOR =====
    // spaceID to be payload.space.id
    // contributorVcID to be payload.virtualContributorID
    await queryRunner.query(`
      UPDATE in_app_notification
      SET
       spaceID = JSON_UNQUOTE(JSON_EXTRACT(payload, '$.space.id')),
       contributorVcID = JSON_UNQUOTE(JSON_EXTRACT(payload, '$.virtualContributorID'))
      WHERE JSON_EXTRACT(payload, '$.type') = 'VIRTUAL_CONTRIBUTOR'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class InAppNotifications1755262773869 implements MigrationInterface {
  name = 'InAppNotifications1755262773869';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`in_app_notification\` ADD \`sourceEntityID\` char(36) NULL`
    );

    // Update all the categories
    await queryRunner.query(
      `UPDATE \`in_app_notification\` SET \`category\` = 'space-member' WHERE \`category\` = 'member'`
    );
    await queryRunner.query(
      `UPDATE \`in_app_notification\` SET \`category\` = 'space-admin' WHERE \`category\` = 'admin'`
    );
    await queryRunner.query(
      `UPDATE \`in_app_notification\` SET \`category\` = 'user' WHERE \`category\` = 'self'`
    );

    // Update all the event names; only three so far to update
    await queryRunner.query(
      `UPDATE \`in_app_notification\` SET \`event\` = 'space-community-new-member' WHERE \`event\` = 'member-joined'`
    );
    await queryRunner.query(
      `UPDATE \`in_app_notification\` SET \`event\` = 'space-collaboration-callout.published' WHERE \`event\` = 'callout-published'`
    );
    await queryRunner.query(
      `UPDATE \`in_app_notification\` SET \`user-mention\` = 'user-profile-updated' WHERE \`event\` = 'self-profile-updated'`
    );

    // Finally update all inAppNotification payloads
    const inAppNotifications: {
      id: string;
      type: string;
      payload: any;
    }[] = await queryRunner.query(
      `SELECT id, payload, preferenceSetId FROM user`
    );
    for (const notification of inAppNotifications) {
      const payload = notification.payload;
      switch (payload.type) {
        case 'user-mention': {
          const newPayload = {
            senderID: payload.senderID,
          };
          await queryRunner.query(
            `UPDATE \`in_app_notification\` SET \`sourceEntityID\` = ?, \`payload\` = ? WHERE \`id\` = ?`,
            [payload.userID, JSON.stringify(newPayload), notification.id]
          );
          break;
        }
        case 'space-community-new-member': {
          const newPayload = {
            senderID: payload.senderID,
          };
          await queryRunner.query(
            `UPDATE \`in_app_notification\` SET \`sourceEntityID\` = ?, \`payload\` = ? WHERE \`id\` = ?`,
            [payload.spaceID, JSON.stringify(newPayload), notification.id]
          );
          break;
        }
        case 'space-collaboration-callout.published': {
          const newPayload = {
            senderID: payload.senderID,
          };
          await queryRunner.query(
            `UPDATE \`in_app_notification\` SET \`sourceEntityID\` = ?, \`payload\` = ? WHERE \`id\` = ?`,
            [payload.spaceID, JSON.stringify(newPayload), notification.id]
          );
          break;
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`in_app_notification\` DROP COLUMN \`sourceEntityID\``
    );
  }
}

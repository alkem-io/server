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
            type: NotificationEventPayload.USER_MESSAGE_ROOM,
            userID: payload.userID,
            messageID: payload.messageID,
            roomID: payload.roomID,
            comment: payload.comment,
            commentUrl: payload.commentUrl,
            commentOriginName: payload.commentOriginName,
          };
          await queryRunner.query(
            `UPDATE \`in_app_notification\` SET \`payload\` = ? WHERE \`id\` = ?`,
            [JSON.stringify(newPayload), notification.id]
          );
          break;
        }
        case 'space-community-new-member': {
          const newPayload = {
            type: NotificationEventPayload.SPACE_COMMUNITY_CONTRIBUTOR,
            spaceID: payload.spaceID,
            contributorID: payload.senderID,
          };
          await queryRunner.query(
            `UPDATE \`in_app_notification\` SET \`payload\` = ? WHERE \`id\` = ?`,
            [JSON.stringify(newPayload), notification.id]
          );
          break;
        }
        case 'space-collaboration-callout.published': {
          const newPayload = {
            type: NotificationEventPayload.SPACE_COLLABORATION_CALLOUT,
            spaceID: payload.spaceID,
            calloutID: payload.calloutID,
          };
          await queryRunner.query(
            `UPDATE \`in_app_notification\` SET \`payload\` = ? WHERE \`id\` = ?`,
            [JSON.stringify(newPayload), notification.id]
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

enum NotificationEventPayload {
  // Platform notifications
  PLATFORM_FORUM_DISCUSSION = 'PLATFORM_FORUM_DISCUSSION',
  PLATFORM_FORUM_DISCUSSION_COMMENT = 'PLATFORM_FORUM_DISCUSSION_COMMENT',
  PLATFORM_USER_PROFILE_REMOVED = 'PLATFORM_USER_PROFILE_REMOVED',
  PLATFORM_GLOBAL_ROLE_CHANGE = 'PLATFORM_GLOBAL_ROLE_CHANGE',

  // Organization notifications
  ORGANIZATION_MESSAGE_DIRECT = 'ORGANIZATION_MESSAGE_DIRECT',
  ORGANIZATION_MESSAGE_ROOM = 'ORGANIZATION_MESSAGE_ROOM',

  // Space notifications
  SPACE = 'SPACE',
  SPACE_COMMUNITY_APPLICATION = 'SPACE_COMMUNITY_APPLICATION',
  SPACE_COMMUNITY_CONTRIBUTOR = 'SPACE_COMMUNITY_CONTRIBUTOR',
  SPACE_COMMUNITY_INVITATION = 'SPACE_COMMUNITY_INVITATION',
  SPACE_COMMUNITY_INVITATION_USER_PLATFORM = 'SPACE_COMMUNITY_INVITATION_USER_PLATFORM',
  SPACE_COMMUNICATION_MESSAGE_DIRECT = 'SPACE_COMMUNICATION_MESSAGE_DIRECT',
  SPACE_COMMUNICATION_UPDATE = 'SPACE_COMMUNICATION_UPDATE',
  SPACE_COLLABORATION_POST = 'SPACE_COLLABORATION_POST',
  SPACE_COLLABORATION_POST_COMMENT = 'SPACE_COLLABORATION_POST_COMMENT',
  SPACE_COLLABORATION_WHITEBOARD = 'SPACE_COLLABORATION_WHITEBOARD',
  SPACE_COLLABORATION_CALLOUT = 'SPACE_COLLABORATION_CALLOUT',

  // User notifications
  USER = 'USER',
  USER_MESSAGE_DIRECT = 'USER_MESSAGE_DIRECT',
  USER_MESSAGE_ROOM = 'USER_MESSAGE_ROOM',
}

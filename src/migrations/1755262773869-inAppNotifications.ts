import { MigrationInterface, QueryRunner } from 'typeorm';

export class InAppNotifications1755262773869 implements MigrationInterface {
  name = 'InAppNotifications1755262773869';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`in_app_notification\` ADD \`sourceEntityID\` char(36) NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`in_app_notification\` CHANGE \`triggeredByID\` \`triggeredByID\` char(36) NULL COMMENT 'The contributor who triggered the event.'`
    );
    await queryRunner.query(
      `ALTER TABLE \`in_app_notification\` CHANGE \`payload\` \`payload\` json NOT NULL COMMENT 'Additional data that is relevant for this Notification.'`
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
      `UPDATE \`in_app_notification\` SET \`type\` = 'SPACE_COMMUNITY_NEW_MEMBER' WHERE \`type\` = 'communityNewMember'`
    );
    await queryRunner.query(
      `UPDATE \`in_app_notification\` SET \`type\` = 'SPACE_COLLABORATION_CALLOUT_PUBLISHED' WHERE \`type\` = 'collaborationCalloutPublished'`
    );
    await queryRunner.query(
      `UPDATE \`in_app_notification\` SET \`type\` = 'USER_MENTION' WHERE \`type\` = 'communicationUserMention'`
    );

    // Finally update all inAppNotification payloads
    const inAppNotifications: {
      id: string;
      type: string;
      payload: any;
    }[] = await queryRunner.query(
      `SELECT id, type, payload FROM in_app_notification`
    );

    for (const notification of inAppNotifications) {
      // Add null/safety checks
      if (!notification.payload) continue;

      let payload;
      try {
        payload =
          typeof notification.payload === 'string'
            ? JSON.parse(notification.payload)
            : notification.payload;
      } catch (error) {
        console.warn(
          `Failed to parse payload for notification ${notification.id}:`,
          error
        );
        continue;
      }

      if (!payload || typeof payload !== 'object') continue;

      switch (payload.type) {
        case 'communicationUserMention': {
          const newPayload = {
            type: NotificationEventPayload.USER_MESSAGE_ROOM,
            userID: payload.receiverID,
            comment: payload.comment,
            commentUrl: payload.commentOrigin?.url,
            commentOriginName: payload.commentOrigin?.displayName,
          };
          await queryRunner.query(
            `UPDATE \`in_app_notification\` SET \`payload\` = ? WHERE \`id\` = ?`,
            [JSON.stringify(newPayload), notification.id]
          );

          // No sourceEntityID!
          break;
        }
        case 'communityNewMember': {
          const newPayload = {
            type: NotificationEventPayload.SPACE_COMMUNITY_CONTRIBUTOR,
            spaceID: payload.spaceID,
            contributorID: payload.newMemberID,
          };
          await queryRunner.query(
            `UPDATE \`in_app_notification\` SET \`payload\` = ? WHERE \`id\` = ?`,
            [JSON.stringify(newPayload), notification.id]
          );

          // Set sourceEntityID to the spaceID for community notifications
          if (payload.spaceID) {
            await queryRunner.query(
              `UPDATE \`in_app_notification\` SET \`sourceEntityID\` = ? WHERE \`id\` = ?`,
              [payload.spaceID, notification.id]
            );
          }
          break;
        }
        case 'collaborationCalloutPublished': {
          const newPayload = {
            type: NotificationEventPayload.SPACE_COLLABORATION_CALLOUT,
            spaceID: payload.spaceID,
            calloutID: payload.calloutID,
          };
          await queryRunner.query(
            `UPDATE \`in_app_notification\` SET \`payload\` = ? WHERE \`id\` = ?`,
            [JSON.stringify(newPayload), notification.id]
          );

          // Set sourceEntityID to calloutID if available, otherwise spaceID
          const sourceEntityID = payload.calloutID || payload.spaceID;
          if (sourceEntityID) {
            await queryRunner.query(
              `UPDATE \`in_app_notification\` SET \`sourceEntityID\` = ? WHERE \`id\` = ?`,
              [sourceEntityID, notification.id]
            );
          }
          break;
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert type name changes
    await queryRunner.query(
      `UPDATE \`in_app_notification\` SET \`type\` = 'communityNewMember' WHERE \`type\` = 'SPACE_COMMUNITY_NEW_MEMBER'`
    );
    await queryRunner.query(
      `UPDATE \`in_app_notification\` SET \`type\` = 'collaborationCalloutPublished' WHERE \`type\` = 'SPACE_COLLABORATION_CALLOUT_PUBLISHED'`
    );
    await queryRunner.query(
      `UPDATE \`in_app_notification\` SET \`type\` = 'communicationUserMention' WHERE \`type\` = 'USER_MENTION'`
    );

    // Revert category changes
    await queryRunner.query(
      `UPDATE \`in_app_notification\` SET \`category\` = 'member' WHERE \`category\` = 'space-member'`
    );
    await queryRunner.query(
      `UPDATE \`in_app_notification\` SET \`category\` = 'admin' WHERE \`category\` = 'space-admin'`
    );
    await queryRunner.query(
      `UPDATE \`in_app_notification\` SET \`category\` = 'self' WHERE \`category\` = 'user'`
    );

    // Revert payload changes (would need complex logic to restore original payloads)
    // NOTE: This is a simplified revert - full payload restoration would require
    // storing original payloads or implementing reverse transformation logic

    // Revert column comments (remove them)
    await queryRunner.query(
      `ALTER TABLE \`in_app_notification\` CHANGE \`triggeredByID\` \`triggeredByID\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`in_app_notification\` CHANGE \`payload\` \`payload\` json NOT NULL`
    );

    // Remove the added column
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

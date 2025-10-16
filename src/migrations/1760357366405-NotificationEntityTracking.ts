import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: NotificationEntityTracking1760357366405
 *
 * Purpose: Add entity tracking columns to in_app_notification table and establish foreign key relationships.
 * This enables automatic cascade deletion of notifications when referenced entities are deleted.
 *
 * Steps performed:
 * 1. Add new FK columns (spaceID, organizationID, userID, applicationID, invitationID, calloutID, contributionID, roomID, messageID)
 * 2. Backfill new columns from existing JSON payload data using MySQL JSON functions
 * 3. Clean up orphaned notifications where referenced entities (including receiverID) no longer exist in the database
 * 4. Add foreign key constraints for all entity tracking columns including receiverID (after data is clean)
 *
 * Why this order?
 * - Columns are added first without FK constraints to allow temporary invalid references
 * - Data is backfilled from JSON payloads (may contain references to deleted entities)
 * - Orphaned notifications are deleted to ensure data integrity (including notifications with invalid receiverID)
 * - FK constraints are added last to enforce referential integrity going forward
 *
 * Note about messageID:
 * - messageID is NOT an actual foreign key because messages are stored in Synapse (external Matrix server), not in the local database
 * - It's tracked as a regular column to support manual notification deletion when messages are deleted
 * - No FK constraint is created for messageID, and no cleanup is performed for orphaned message references
 */
export class NotificationEntityTracking1760357366405 implements MigrationInterface {
    name = 'NotificationEntityTracking1760357366405'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ==================== STEP 1: Add columns without FK constraints ====================
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD \`spaceID\` char(36) NULL COMMENT 'FK to Space - cascade deletes notification when space is deleted'`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD \`organizationID\` char(36) NULL COMMENT 'FK to Organization - cascade deletes notification when organization is deleted'`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD \`userID\` char(36) NULL COMMENT 'FK to User - cascade deletes notification when referenced user is deleted'`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD \`applicationID\` char(36) NULL COMMENT 'FK to Application - cascade deletes notification when application is deleted'`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD \`invitationID\` char(36) NULL COMMENT 'FK to Invitation - cascade deletes notification when invitation is deleted'`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD \`calloutID\` char(36) NULL COMMENT 'FK to Callout - cascade deletes notification when callout is deleted'`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD \`contributionID\` char(36) NULL COMMENT 'FK to Callout Contribution - cascade deletes notification when Contribution is deleted'`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD \`roomID\` char(36) NULL COMMENT 'FK to Room - cascade deletes notification when the room is deleted'`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD \`messageID\` char(44) NULL COMMENT 'Not actual FK - used to manually delete notification when the message is deleted'`);

        // ==================== STEP 2: Backfill FK columns from JSON payload ====================
      // - when it's SPACE_COLLABORATION_CALLOUT_POST_COMMENT, the contribution id is a Post. Convert the postid to be the actual contributionId
      const data: { id: string; contributionParentID: string; }[] = await queryRunner.query(`
          SELECT in_app_notification.id, callout_contribution.id as contributionParentID from in_app_notification
          LEFT JOIN callout_contribution ON callout_contribution.postId = JSON_UNQUOTE(in_app_notification.payload->'$.contributionID')
          WHERE payload->'$.type' = 'SPACE_COLLABORATION_CALLOUT_POST_COMMENT';
      `);
      for (const { id, contributionParentID } of data) {
        // payload.contributionID to be the ACTUAL contributionID instead of the postID
        await queryRunner.query(`
          UPDATE in_app_notification SET
          payload = JSON_SET(payload, '$.contributionID', '${contributionParentID}')
          WHERE id = '${id}'
        `);
      }
      await queryRunner.query(`
          UPDATE in_app_notification
          SET contributionID = JSON_UNQUOTE(JSON_EXTRACT(payload, '$.contributionID'))
          WHERE JSON_EXTRACT(payload, '$.contributionID') IS NOT NULL
          AND contributionID IS NULL
      `);
      await queryRunner.query(`
            UPDATE in_app_notification
            SET spaceID = JSON_UNQUOTE(JSON_EXTRACT(payload, '$.spaceID'))
            WHERE JSON_EXTRACT(payload, '$.spaceID') IS NOT NULL
            AND spaceID IS NULL
        `);
        // skip ORGANIZATION_MESSAGE_SENDER
        await queryRunner.query(`
            UPDATE in_app_notification
            SET organizationID = JSON_UNQUOTE(JSON_EXTRACT(payload, '$.organizationID'))
            WHERE JSON_EXTRACT(payload, '$.organizationID') IS NOT NULL
            AND organizationID IS NULL AND type != 'ORGANIZATION_MESSAGE_SENDER'
        `);
        // skip USER_MESSAGE_SENDER and PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED
        await queryRunner.query(`
            UPDATE in_app_notification
            SET userID = JSON_UNQUOTE(JSON_EXTRACT(payload, '$.userID'))
            WHERE JSON_EXTRACT(payload, '$.userID') IS NOT NULL
            AND userID IS NULL AND type != 'USER_MESSAGE_SENDER' AND type != 'PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED'
        `);
        await queryRunner.query(`
            UPDATE in_app_notification
            SET applicationID = JSON_UNQUOTE(JSON_EXTRACT(payload, '$.applicationID'))
            WHERE JSON_EXTRACT(payload, '$.applicationID') IS NOT NULL
            AND applicationID IS NULL
        `);
        await queryRunner.query(`
            UPDATE in_app_notification
            SET invitationID = JSON_UNQUOTE(JSON_EXTRACT(payload, '$.invitationID'))
            WHERE JSON_EXTRACT(payload, '$.invitationID') IS NOT NULL
            AND invitationID IS NULL
        `);
        await queryRunner.query(`
            UPDATE in_app_notification
            SET calloutID = JSON_UNQUOTE(JSON_EXTRACT(payload, '$.calloutID'))
            WHERE JSON_EXTRACT(payload, '$.calloutID') IS NOT NULL
            AND calloutID IS NULL
        `);
        await queryRunner.query(`
            UPDATE in_app_notification
            SET roomID = JSON_UNQUOTE(JSON_EXTRACT(payload, '$.roomID'))
            WHERE JSON_EXTRACT(payload, '$.roomID') IS NOT NULL
            AND roomID IS NULL
        `);
        await queryRunner.query(`
            UPDATE in_app_notification
            SET messageID = JSON_UNQUOTE(JSON_EXTRACT(payload, '$.messageID'))
            WHERE JSON_EXTRACT(payload, '$.messageID') IS NOT NULL
            AND roomID IS NULL
        `);
        // ==================== STEP 3: Clean up orphaned notifications ====================
        // Delete notifications where referenced entities no longer exist (including invalid receiverID)
        await queryRunner.query(`
            DELETE in_app_notification FROM in_app_notification
            LEFT JOIN user AS receiver ON in_app_notification.receiverID = receiver.id
            WHERE in_app_notification.receiverID IS NOT NULL AND receiver.id IS NULL
        `);
        await queryRunner.query(`
            DELETE in_app_notification FROM in_app_notification
            LEFT JOIN space ON in_app_notification.spaceID = space.id
            WHERE in_app_notification.spaceID IS NOT NULL AND space.id IS NULL
        `);
        await queryRunner.query(`
            DELETE in_app_notification FROM in_app_notification
            LEFT JOIN organization ON in_app_notification.organizationID = organization.id
            WHERE in_app_notification.organizationID IS NOT NULL AND organization.id IS NULL
        `);
        await queryRunner.query(`
            DELETE in_app_notification FROM in_app_notification
            LEFT JOIN user ON in_app_notification.userID = user.id
            WHERE in_app_notification.userID IS NOT NULL AND user.id IS NULL
        `);
        await queryRunner.query(`
            DELETE in_app_notification FROM in_app_notification
            LEFT JOIN application ON in_app_notification.applicationID = application.id
            WHERE in_app_notification.applicationID IS NOT NULL AND application.id IS NULL
        `);
        await queryRunner.query(`
            DELETE in_app_notification FROM in_app_notification
            LEFT JOIN invitation ON in_app_notification.invitationID = invitation.id
            WHERE in_app_notification.invitationID IS NOT NULL AND invitation.id IS NULL
        `);
        await queryRunner.query(`
            DELETE in_app_notification FROM in_app_notification
            LEFT JOIN callout ON in_app_notification.calloutID = callout.id
            WHERE in_app_notification.calloutID IS NOT NULL AND callout.id IS NULL
        `);
        await queryRunner.query(`
            DELETE in_app_notification FROM in_app_notification
            LEFT JOIN callout_contribution ON in_app_notification.contributionID = callout_contribution.id
            WHERE in_app_notification.contributionID IS NOT NULL AND callout_contribution.id IS NULL
        `);
        await queryRunner.query(`
            DELETE in_app_notification FROM in_app_notification
            LEFT JOIN room ON in_app_notification.roomID = room.id
            WHERE in_app_notification.roomID IS NOT NULL AND room.id IS NULL
        `);
        // ==================== STEP 4: Add FK constraints (data is now clean) ====================
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD CONSTRAINT \`FK_a84dd5170304562dbd58b37521e\` FOREIGN KEY (\`receiverID\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD CONSTRAINT \`FK_60085ab32808bc5f628fe3ca587\` FOREIGN KEY (\`spaceID\`) REFERENCES \`space\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD CONSTRAINT \`FK_3a71f82d91a3809bd652cd80f1f\` FOREIGN KEY (\`organizationID\`) REFERENCES \`organization\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD CONSTRAINT \`FK_d298041d567d984ed6c0667c814\` FOREIGN KEY (\`userID\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD CONSTRAINT \`FK_b8fe43c84d0f765bba5f6bd054d\` FOREIGN KEY (\`invitationID\`) REFERENCES \`invitation\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD CONSTRAINT \`FK_b2f1dc00232220031a6921da1b9\` FOREIGN KEY (\`applicationID\`) REFERENCES \`application\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD CONSTRAINT \`FK_75c3fa6ba71954e8586bfdbe725\` FOREIGN KEY (\`calloutID\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        // ideally it has to be a Callout Contribution; however this points to Posts only right now; to be adjusted when the payload can cover Contributions rather than Posts
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD CONSTRAINT \`FK_6df3d947b625cf6bd2ed856f632\` FOREIGN KEY (\`contributionID\`) REFERENCES \`callout_contribution\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD CONSTRAINT \`FK_in_app_to_room_id\` FOREIGN KEY (\`roomID\`) REFERENCES \`room\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop all FK constraints
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP FOREIGN KEY \`FK_in_app_to_room_id\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP FOREIGN KEY \`FK_6df3d947b625cf6bd2ed856f632\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP FOREIGN KEY \`FK_75c3fa6ba71954e8586bfdbe725\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP FOREIGN KEY \`FK_b2f1dc00232220031a6921da1b9\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP FOREIGN KEY \`FK_b8fe43c84d0f765bba5f6bd054d\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP FOREIGN KEY \`FK_d298041d567d984ed6c0667c814\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP FOREIGN KEY \`FK_3a71f82d91a3809bd652cd80f1f\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP FOREIGN KEY \`FK_60085ab32808bc5f628fe3ca587\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP FOREIGN KEY \`FK_a84dd5170304562dbd58b37521e\``);
        // Drop all columns
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP COLUMN \`messageID\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP COLUMN \`roomID\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP COLUMN \`contributionID\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP COLUMN \`calloutID\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP COLUMN \`invitationID\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP COLUMN \`applicationID\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP COLUMN \`userID\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP COLUMN \`organizationID\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP COLUMN \`spaceID\``);
    }

}

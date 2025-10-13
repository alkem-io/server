import { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillNotificationEntityTracking1760354882985 implements MigrationInterface {
    name = 'BackfillNotificationEntityTracking1760354882985'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Backfill FK columns from JSON payload for existing notifications
        // This uses MySQL JSON functions to extract values from the payload column

        // Update spaceID from payload for space-related notifications
        await queryRunner.query(`
            UPDATE in_app_notification
            SET spaceID = JSON_UNQUOTE(JSON_EXTRACT(payload, '$.spaceID'))
            WHERE JSON_EXTRACT(payload, '$.spaceID') IS NOT NULL
            AND spaceID IS NULL
        `);

        // Update organizationID from payload for organization-related notifications
        await queryRunner.query(`
            UPDATE in_app_notification
            SET organizationID = JSON_UNQUOTE(JSON_EXTRACT(payload, '$.organizationID'))
            WHERE JSON_EXTRACT(payload, '$.organizationID') IS NOT NULL
            AND organizationID IS NULL
        `);

        // Update userID from payload for user-related notifications
        await queryRunner.query(`
            UPDATE in_app_notification
            SET userID = JSON_UNQUOTE(JSON_EXTRACT(payload, '$.userID'))
            WHERE JSON_EXTRACT(payload, '$.userID') IS NOT NULL
            AND userID IS NULL
        `);

        // Update applicationID from payload
        await queryRunner.query(`
            UPDATE in_app_notification
            SET applicationID = JSON_UNQUOTE(JSON_EXTRACT(payload, '$.applicationID'))
            WHERE JSON_EXTRACT(payload, '$.applicationID') IS NOT NULL
            AND applicationID IS NULL
        `);

        // Update invitationID from payload
        await queryRunner.query(`
            UPDATE in_app_notification
            SET invitationID = JSON_UNQUOTE(JSON_EXTRACT(payload, '$.invitationID'))
            WHERE JSON_EXTRACT(payload, '$.invitationID') IS NOT NULL
            AND invitationID IS NULL
        `);

        // Update calloutID from payload
        await queryRunner.query(`
            UPDATE in_app_notification
            SET calloutID = JSON_UNQUOTE(JSON_EXTRACT(payload, '$.calloutID'))
            WHERE JSON_EXTRACT(payload, '$.calloutID') IS NOT NULL
            AND calloutID IS NULL
        `);

        // Update contributionID from payload
        await queryRunner.query(`
            UPDATE in_app_notification
            SET contributionID = JSON_UNQUOTE(JSON_EXTRACT(payload, '$.contributionID'))
            WHERE JSON_EXTRACT(payload, '$.contributionID') IS NOT NULL
            AND contributionID IS NULL
        `);

        // Clean up orphaned notifications where core entities no longer exist
        // This prevents FK constraint violations and removes meaningless notifications

        await queryRunner.query(`
            DELETE n FROM in_app_notification n
            LEFT JOIN space s ON n.spaceID = s.id
            WHERE n.spaceID IS NOT NULL AND s.id IS NULL
        `);

        await queryRunner.query(`
            DELETE n FROM in_app_notification n
            LEFT JOIN organization o ON n.organizationID = o.id
            WHERE n.organizationID IS NOT NULL AND o.id IS NULL
        `);

        await queryRunner.query(`
            DELETE n FROM in_app_notification n
            LEFT JOIN user u ON n.userID = u.id
            WHERE n.userID IS NOT NULL AND u.id IS NULL
        `);

        await queryRunner.query(`
            DELETE n FROM in_app_notification n
            LEFT JOIN application a ON n.applicationID = a.id
            WHERE n.applicationID IS NOT NULL AND a.id IS NULL
        `);

        await queryRunner.query(`
            DELETE n FROM in_app_notification n
            LEFT JOIN invitation i ON n.invitationID = i.id
            WHERE n.invitationID IS NOT NULL AND i.id IS NULL
        `);

        await queryRunner.query(`
            DELETE n FROM in_app_notification n
            LEFT JOIN callout c ON n.calloutID = c.id
            WHERE n.calloutID IS NOT NULL AND c.id IS NULL
        `);

        await queryRunner.query(`
            DELETE n FROM in_app_notification n
            LEFT JOIN callout_contribution cc ON n.contributionID = cc.id
            WHERE n.contributionID IS NOT NULL AND cc.id IS NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No need to revert - `1760357366405-NotificationEntityTracking` handles column removal
        // Data was extracted from JSON payload which is still intact
    }
}


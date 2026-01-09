import { MigrationInterface, QueryRunner } from "typeorm"

export class RenameConversationsSetToMessaging1765535403758 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Rename table
        await queryRunner.renameTable("conversations_set", "messaging");

        // Rename column in conversation table
        await queryRunner.renameColumn("conversation", "conversationsSetId", "messagingId");

        // Rename column in platform table
        await queryRunner.renameColumn("platform", "conversationsSetId", "messagingId");

        // Update authorization policy type
        await queryRunner.query(
            `UPDATE "authorization_policy" SET "type" = 'communication-messaging' WHERE "type" = 'communication-conversations-set'`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert authorization policy type
        await queryRunner.query(
            `UPDATE "authorization_policy" SET "type" = 'communication-conversations-set' WHERE "type" = 'communication-messaging'`
        );

        // Revert platform column
        await queryRunner.renameColumn("platform", "messagingId", "conversationsSetId");

        // Revert conversation column
        await queryRunner.renameColumn("conversation", "messagingId", "conversationsSetId");

        // Revert table rename
        await queryRunner.renameTable("messaging", "conversations_set");
    }

}

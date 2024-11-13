import { MigrationInterface, QueryRunner } from "typeorm";

export class InAppNotifications1731509872258 implements MigrationInterface {
    name = 'InAppNotifications1731509872258'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`in_app_notification\` (
            \`id\` char(36) NOT NULL,
             \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
              \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
               \`version\` int NOT NULL,
                \`triggeredAt\` datetime NOT NULL COMMENT 'UTC',
                 \`type\` varchar(128) NOT NULL,
                  \`state\` varchar(128) NOT NULL,
                   \`triggeredByID\` char(36) NOT NULL COMMENT 'Who triggered the event',
                    \`resourceID\` char(36) NOT NULL COMMENT 'The affected resource. Different entity based on the notification',
                     \`category\` varchar(128) NOT NULL,
                      \`receiverID\` char(36) NOT NULL COMMENT 'Who is the receiver of this notification',
                       PRIMARY KEY (\`id\`)
             ) ENGINE=InnoDB
         `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`in_app_notification\``);
    }

}

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
                   \`triggeredByID\` char(36) NULL COMMENT 'The contributor who triggered the event, if applicable.',
                    \`category\` varchar(128) NOT NULL COMMENT 'Which category (role) is this notification targeted to.',
                     \`receiverID\` char(36) NOT NULL COMMENT 'The contributor who is the receiver of this notification',
                      \`payload\` json NOT NULL COMMENT 'Holds the original notification payload as it was received',
                       PRIMARY KEY (\`id\`)
             ) ENGINE=InnoDB
         `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`in_app_notification\``);
    }

}

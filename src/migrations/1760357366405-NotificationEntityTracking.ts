import { MigrationInterface, QueryRunner } from "typeorm";

export class Test1760357366405 implements MigrationInterface {
    name = 'Test1760357366405'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD \`spaceID\` char(36) NULL COMMENT 'FK to Space - cascade deletes notification when space is deleted'`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD \`organizationID\` char(36) NULL COMMENT 'FK to Organization - cascade deletes notification when organization is deleted'`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD \`userID\` char(36) NULL COMMENT 'FK to User - cascade deletes notification when referenced user is deleted'`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD \`applicationID\` char(36) NULL COMMENT 'FK to Application - cascade deletes notification when application is deleted'`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD \`invitationID\` char(36) NULL COMMENT 'FK to Invitation - cascade deletes notification when invitation is deleted'`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD \`calloutID\` char(36) NULL COMMENT 'FK to Callout - cascade deletes notification when callout is deleted'`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD \`contributionID\` char(36) NULL COMMENT 'FK to CalloutContribution - cascade deletes notification when contribution is deleted'`);
        //
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD CONSTRAINT \`FK_a84dd5170304562dbd58b37521e\` FOREIGN KEY (\`receiverID\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        //
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD CONSTRAINT \`FK_60085ab32808bc5f628fe3ca587\` FOREIGN KEY (\`spaceID\`) REFERENCES \`space\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD CONSTRAINT \`FK_3a71f82d91a3809bd652cd80f1f\` FOREIGN KEY (\`organizationID\`) REFERENCES \`organization\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD CONSTRAINT \`FK_d298041d567d984ed6c0667c814\` FOREIGN KEY (\`userID\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD CONSTRAINT \`FK_b8fe43c84d0f765bba5f6bd054d\` FOREIGN KEY (\`applicationID\`) REFERENCES \`application\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD CONSTRAINT \`FK_b2f1dc00232220031a6921da1b9\` FOREIGN KEY (\`invitationID\`) REFERENCES \`invitation\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD CONSTRAINT \`FK_75c3fa6ba71954e8586bfdbe725\` FOREIGN KEY (\`calloutID\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` ADD CONSTRAINT \`FK_6df3d947b625cf6bd2ed856f632\` FOREIGN KEY (\`contributionID\`) REFERENCES \`callout_contribution\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP FOREIGN KEY \`FK_6df3d947b625cf6bd2ed856f632\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP FOREIGN KEY \`FK_75c3fa6ba71954e8586bfdbe725\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP FOREIGN KEY \`FK_b2f1dc00232220031a6921da1b9\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP FOREIGN KEY \`FK_b8fe43c84d0f765bba5f6bd054d\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP FOREIGN KEY \`FK_d298041d567d984ed6c0667c814\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP FOREIGN KEY \`FK_3a71f82d91a3809bd652cd80f1f\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP FOREIGN KEY \`FK_60085ab32808bc5f628fe3ca587\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP FOREIGN KEY \`FK_a84dd5170304562dbd58b37521e\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP COLUMN \`contributionID\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP COLUMN \`calloutID\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP COLUMN \`invitationID\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP COLUMN \`applicationID\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP COLUMN \`userID\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP COLUMN \`organizationID\``);
        await queryRunner.query(`ALTER TABLE \`in_app_notification\` DROP COLUMN \`spaceID\``);
    }

}

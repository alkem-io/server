import { MigrationInterface, QueryRunner } from "typeorm";

export class DropCommunicationId1764188001912 implements MigrationInterface {
    name = 'DropCommunicationId1764188001912'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_user_conversationsSetId\``);
        await queryRunner.query(`DROP INDEX \`IDX_user_conversationsSetId\` ON \`user\``);
        await queryRunner.query(`DROP INDEX \`REL_user_conversationsSetId\` ON \`user\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`communicationID\``);
        await queryRunner.query(`ALTER TABLE \`organization\` DROP COLUMN \`communicationID\``);
        await queryRunner.query(`ALTER TABLE \`virtual_contributor\` DROP COLUMN \`communicationID\``);
        await queryRunner.query(`ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_7bb8a970cf4ef09e1f5169a544\` (\`conversationsSetId\`)`);
        await queryRunner.query(`ALTER TABLE \`virtual_contributor\` CHANGE \`platformSettings\` \`platformSettings\` json NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_7bb8a970cf4ef09e1f5169a544\` ON \`user\` (\`conversationsSetId\`)`);
        await queryRunner.query(`ALTER TABLE \`user\` ADD CONSTRAINT \`FK_7bb8a970cf4ef09e1f5169a5440\` FOREIGN KEY (\`conversationsSetId\`) REFERENCES \`conversations_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_7bb8a970cf4ef09e1f5169a5440\``);
        await queryRunner.query(`DROP INDEX \`REL_7bb8a970cf4ef09e1f5169a544\` ON \`user\``);
        await queryRunner.query(`ALTER TABLE \`virtual_contributor\` CHANGE \`platformSettings\` \`platformSettings\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` DROP INDEX \`IDX_7bb8a970cf4ef09e1f5169a544\``);
        await queryRunner.query(`ALTER TABLE \`virtual_contributor\` ADD \`communicationID\` varchar(255) NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE \`organization\` ADD \`communicationID\` varchar(255) NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`communicationID\` varchar(255) NOT NULL DEFAULT ''`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_user_conversationsSetId\` ON \`user\` (\`conversationsSetId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_user_conversationsSetId\` ON \`user\` (\`conversationsSetId\`)`);
        await queryRunner.query(`ALTER TABLE \`user\` ADD CONSTRAINT \`FK_user_conversationsSetId\` FOREIGN KEY (\`conversationsSetId\`) REFERENCES \`conversations_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}

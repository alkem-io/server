import { MigrationInterface, QueryRunner } from "typeorm";

export class DropCommunicationId1764011369202 implements MigrationInterface {
    name = 'DropCommunicationId1764011369202'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_user_authenticationID\` ON \`user\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`communicationID\``);
        await queryRunner.query(`ALTER TABLE \`organization\` DROP COLUMN \`communicationID\``);
        await queryRunner.query(`ALTER TABLE \`virtual_contributor\` DROP COLUMN \`communicationID\``);
        await queryRunner.query(`ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_0742ec75e9fc10a1e393a3ef4c\` (\`authenticationID\`)`);
    }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // this is irreversible migration
    // reversing can be done only via restoring from backup
        await queryRunner.query(`ALTER TABLE \`user\` DROP INDEX \`IDX_0742ec75e9fc10a1e393a3ef4c\``);
        await queryRunner.query(`ALTER TABLE \`virtual_contributor\` ADD \`communicationID\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`organization\` ADD \`communicationID\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`communicationID\` varchar(255) NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_user_authenticationID\` ON \`user\` (\`authenticationID\`)`);
    }

}

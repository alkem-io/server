import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAvatarUrlToRoom1772877966625 implements MigrationInterface {
    name = 'AddAvatarUrlToRoom1772877966625'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "room" ADD "avatarUrl" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "room" DROP COLUMN "avatarUrl"`);
    }

}

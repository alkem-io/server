import {MigrationInterface, QueryRunner} from "typeorm";

export class IncreaseMaxLength1606986392031 implements MigrationInterface {
    name = 'IncreaseMaxLength1606986392031'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `aspect` MODIFY COLUMN `framing` varchar(400) NOT NULL");
        await queryRunner.query("ALTER TABLE `aspect` MODIFY COLUMN `explanation` varchar(400) NOT NULL");
        await queryRunner.query("ALTER TABLE `opportunity` MODIFY COLUMN `textID` varchar(15) NOT NULL");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `opportunity` MODIFY COLUMN `textID` varchar(20) NOT NULL");
        await queryRunner.query("ALTER TABLE `aspect` MODIFY COLUMN `explanation` varchar(300) NOT NULL");
        await queryRunner.query("ALTER TABLE `aspect` MODIFY COLUMN `framing` varchar(255) NOT NULL");
    }

}

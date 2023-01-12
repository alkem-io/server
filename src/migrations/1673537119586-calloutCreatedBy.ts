import {MigrationInterface, QueryRunner} from "typeorm";

export class calloutCreatedBy1673537119586 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`createdBy\` char(36) NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`callout\` DROP COLUMN \`createdBy\``);
  }

}

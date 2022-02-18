import { MigrationInterface, QueryRunner } from 'typeorm';

export class ecoverseToHub1645089442935 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`ecoverse\` RENAME TO \`hub\``);
    await queryRunner.query(
      `ALTER TABLE \`application\` CHANGE COLUMN \`ecoverseID\` \`hubID\` VARCHAR(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` CHANGE COLUMN \`ecoverseID\` \`hubID\` VARCHAR(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` CHANGE COLUMN \`parentEcoverseID\` \`parentHubID\` VARCHAR(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` CHANGE COLUMN \`ecoverseID\` \`hubID\` VARCHAR(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` CHANGE COLUMN \`ecoverseID\` \`hubID\` VARCHAR(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` CHANGE COLUMN \`ecoverseID\` \`hubID\` VARCHAR(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` CHANGE COLUMN \`ecoverseID\` \`hubID\` VARCHAR(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` CHANGE COLUMN \`ecoverseID\` \`hubID\` VARCHAR(255) NOT NULL`
    );
    await queryRunner.query(
      `UPDATE \`credential\` SET \`type\` = 'hub-member' WHERE \`type\` = 'ecoverse-member'`
    );
    await queryRunner.query(
      `UPDATE \`credential\` SET \`type\` = 'hub-admin' WHERE \`type\` = 'ecoverse-admin'`
    );
    await queryRunner.query(
      `UPDATE \`credential\` SET \`type\` = 'hub-host' WHERE \`type\` = 'ecoverse-host'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`credential\` SET \`type\` = 'ecoverse-host' WHERE \`type\` = 'hub-host'`
    );
    await queryRunner.query(
      `UPDATE \`credential\` SET \`type\` = 'ecoverse-admin' WHERE \`type\` = 'hub-admin'`
    );
    await queryRunner.query(
      `UPDATE \`credential\` SET \`type\` = 'ecoverse-member' WHERE \`type\` = 'hub-member'`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` CHANGE COLUMN \`hubID\` \`ecoverseID\` VARCHAR(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` CHANGE COLUMN \`hubID\` \`ecoverseID\` VARCHAR(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` CHANGE COLUMN \`hubID\` \`ecoverseID\` VARCHAR(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` CHANGE COLUMN \`hubID\` \`ecoverseID\` VARCHAR(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` CHANGE COLUMN \`hubID\` \`ecoverseID\` VARCHAR(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` CHANGE COLUMN \`parentHubID\` \`parentEcoverseID\` VARCHAR(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` CHANGE COLUMN \`hubID\` \`ecoverseID\` VARCHAR(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` CHANGE COLUMN \`hubID\` \`ecoverseID\` VARCHAR(255) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`hub\` RENAME TO \`ecoverse\``);
  }
}

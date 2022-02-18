import { MigrationInterface, QueryRunner } from 'typeorm';

export class ecoverseToHub1645089442935 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`ecoverse\` RENAME TO \`hub\``);
    await queryRunner.query(
      `ALTER TABLE \`application\` RENAME COLUMN \`ecoverseID\` TO \`hubID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` RENAME COLUMN \`ecoverseID\` TO \`hubID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` RENAME COLUMN \`parentEcoverseID\` TO \`parentHubID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` RENAME COLUMN \`ecoverseID\` TO \`hubID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` RENAME COLUMN \`ecoverseID\` TO \`hubID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` RENAME COLUMN \`ecoverseID\` TO \`hubID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` RENAME COLUMN \`ecoverseID\` TO \`hubID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` RENAME COLUMN \`ecoverseID\` TO \`hubID\``
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
      `ALTER TABLE \`user_group\` RENAME COLUMN \`hubID\` TO \`ecoverseID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` RENAME COLUMN \`hubID\` TO \`ecoverseID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` RENAME COLUMN \`hubID\` TO \`ecoverseID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` RENAME COLUMN \`hubID\` TO \`ecoverseID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` RENAME COLUMN \`hubID\` TO \`ecoverseID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` RENAME COLUMN \`parentHubID\` TO \`parentEcoverseID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` RENAME COLUMN \`hubID\` TO \`ecoverseID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` RENAME COLUMN \`hubID\` TO \`ecoverseID\``
    );
    await queryRunner.query(`ALTER TABLE \`hub\` RENAME TO \`ecoverse\``);
  }
}

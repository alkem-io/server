import { MigrationInterface, QueryRunner } from 'typeorm';

export class ecoverseToHxb1645089442935 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`ecoverse\` RENAME TO \`hxb\``);
    await queryRunner.query(
      `ALTER TABLE \`application\` RENAME COLUMN \`ecoverseID\` TO \`hxbID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` RENAME COLUMN \`ecoverseID\` TO \`hxbID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` RENAME COLUMN \`parentEcoverseID\` TO \`parentHxbID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` RENAME COLUMN \`ecoverseID\` TO \`hxbID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` RENAME COLUMN \`ecoverseID\` TO \`hxbID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` RENAME COLUMN \`ecoverseID\` TO \`hxbID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` RENAME COLUMN \`ecoverseID\` TO \`hxbID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` RENAME COLUMN \`ecoverseID\` TO \`hxbID\``
    );
    await queryRunner.query(
      `UPDATE \`credential\` SET \`type\` = 'hxb-member' WHERE \`type\` = 'ecoverse-member'`
    );
    await queryRunner.query(
      `UPDATE \`credential\` SET \`type\` = 'hxb-admin' WHERE \`type\` = 'ecoverse-admin'`
    );
    await queryRunner.query(
      `UPDATE \`credential\` SET \`type\` = 'hxb-host' WHERE \`type\` = 'ecoverse-host'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`credential\` SET \`type\` = 'ecoverse-host' WHERE \`type\` = 'hxb-host'`
    );
    await queryRunner.query(
      `UPDATE \`credential\` SET \`type\` = 'ecoverse-admin' WHERE \`type\` = 'hxb-admin'`
    );
    await queryRunner.query(
      `UPDATE \`credential\` SET \`type\` = 'ecoverse-member' WHERE \`type\` = 'hxb-member'`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` RENAME COLUMN \`hxbID\` TO \`ecoverseID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` RENAME COLUMN \`hxbID\` TO \`ecoverseID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` RENAME COLUMN \`hxbID\` TO \`ecoverseID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` RENAME COLUMN \`hxbID\` TO \`ecoverseID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` RENAME COLUMN \`hxbID\` TO \`ecoverseID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` RENAME COLUMN \`parentHxbID\` TO \`parentEcoverseID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` RENAME COLUMN \`hxbID\` TO \`ecoverseID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` RENAME COLUMN \`hxbID\` TO \`ecoverseID\``
    );
    await queryRunner.query(`ALTER TABLE \`hxb\` RENAME TO \`ecoverse\``);
  }
}

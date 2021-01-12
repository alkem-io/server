import { MigrationInterface, QueryRunner } from 'typeorm';

export class textFieldsLength1610401423621 implements MigrationInterface {
  name = 'textFieldsLength1610401423621';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `actor` MODIFY COLUMN`name` varchar(255) NOT NULL'
    );

    await queryRunner.query('ALTER TABLE `actor` MODIFY COLUMN `description` text NULL');

    await queryRunner.query('ALTER TABLE `actor` MODIFY COLUMN `value` text NULL');

    await queryRunner.query(
      'ALTER TABLE `actor` MODIFY COLUMN `impact` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `context` MODIFY COLUMN `tagline` varchar(255) NULL'
    );

    await queryRunner.query('ALTER TABLE `context` MODIFY COLUMN `background` text NULL');

    await queryRunner.query('ALTER TABLE `context` MODIFY COLUMN `vision` text NULL');

    await queryRunner.query('ALTER TABLE `context` MODIFY COLUMN `impact` text NULL');

    await queryRunner.query('ALTER TABLE `context` MODIFY COLUMN `who` text NULL');

    await queryRunner.query('ALTER TABLE `reference` MODIFY COLUMN `uri` text NOT NULL');

    await queryRunner.query(
      'ALTER TABLE `reference` MODIFY COLUMN `description` text NULL'
    );

    await queryRunner.query('ALTER TABLE `profile` MODIFY COLUMN `avatar` text NULL');

    await queryRunner.query(
      'ALTER TABLE `profile` MODIFY COLUMN `description` text NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `agreement` MODIFY COLUMN `description` text NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `project` MODIFY COLUMN `textID` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `project` MODIFY COLUMN `description` text NULL'
    );

    await queryRunner.query('ALTER TABLE `aspect` MODIFY COLUMN `framing` text NOT NULL');

    await queryRunner.query(
      'ALTER TABLE `ecoverse` MODIFY COLUMN `name` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `challenge` MODIFY COLUMN `name` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `challenge` MODIFY COLUMN `textID` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `relation` MODIFY COLUMN `type` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `relation` MODIFY COLUMN `actorName` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `relation` MODIFY COLUMN `actorType` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `relation` MODIFY COLUMN `actorRole` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `relation` MODIFY COLUMN `description` text NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `opportunity` MODIFY COLUMN `textID` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `actor_group` MODIFY COLUMN `name` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `actor_group` MODIFY COLUMN `description` text NULL'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `actor_group` MODIFY COLUMN `description` varchar(250) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `actor_group` MODIFY COLUMN `name` varchar(100) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `opportunity` MODIFY COLUMN `textID` varchar(15) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `relation` MODIFY COLUMN `description` varchar(400) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `relation` MODIFY COLUMN `actorRole` varchar(100) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `relation` MODIFY COLUMN `actorType` varchar(100) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `relation` MODIFY COLUMN `actorName` varchar(100) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `relation` MODIFY COLUMN `type` varchar(20) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `challenge` MODIFY COLUMN `textID` varchar(15) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `challenge` MODIFY COLUMN `name` varchar(100) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `ecoverse` MODIFY COLUMN `name` varchar(100) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `aspect` MODIFY COLUMN `framing` varchar(400) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `project` MODIFY COLUMN `description` varchar(255) NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `project` MODIFY COLUMN `textID` varchar(20) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `agreement` MODIFY COLUMN `description` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `profile` MODIFY COLUMN `description` varchar(400) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `profile` MODIFY COLUMN `avatar` varchar(250) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `reference` MODIFY COLUMN `description` varchar(300) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `reference` MODIFY COLUMN `uri` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `context` MODIFY COLUMN `who` varchar(2000) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `context` MODIFY COLUMN `impact` varchar(2000) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `context` MODIFY COLUMN `vision` varchar(2000) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `context` MODIFY COLUMN `background` varchar(2000) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `context` MODIFY COLUMN `tagline` varchar(250) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `actor` MODIFY COLUMN `impact` varchar(250) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `actor` MODIFY COLUMN `value` varchar(250) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `actor` MODIFY COLUMN `description` varchar(250) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `actor` MODIFY COLUMN `name` varchar(100) NOT NULL'
    );
  }
}

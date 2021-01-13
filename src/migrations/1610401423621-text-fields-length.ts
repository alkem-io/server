import { MigrationInterface, QueryRunner } from 'typeorm';

export class textFieldsLength1610401423621 implements MigrationInterface {
  name = 'textFieldsLength1610401423621';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `project` MODIFY `state` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` MODIFY `explanation` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` MODIFY `state` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` MODIFY `name` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` MODIFY `state` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` MODIFY `name` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `actor` MODIFY `description` text NULL'
    );

    await queryRunner.query('ALTER TABLE `actor` MODIFY `value` text NULL');

    await queryRunner.query(
      'ALTER TABLE `actor` MODIFY `impact` varchar(255) NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `context` MODIFY `tagline` varchar(255) NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `context` MODIFY `background` text NULL'
    );

    await queryRunner.query('ALTER TABLE `context` MODIFY `vision` text NULL');

    await queryRunner.query('ALTER TABLE `context` MODIFY `impact` text NULL');

    await queryRunner.query('ALTER TABLE `context` MODIFY `who` text NULL');

    await queryRunner.query(
      'ALTER TABLE `reference` MODIFY `uri` text NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `reference` MODIFY `description` text NULL'
    );

    await queryRunner.query('ALTER TABLE `profile` MODIFY `avatar` text NULL');

    await queryRunner.query(
      'ALTER TABLE `profile` MODIFY `description` text NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `agreement` MODIFY `description` text NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `project` MODIFY `textID` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `project` MODIFY `description` text NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `aspect` MODIFY `framing` text NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `ecoverse` MODIFY `name` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `challenge` MODIFY `name` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `challenge` MODIFY `textID` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `relation` MODIFY `type` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `relation` MODIFY `actorName` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `relation` MODIFY `actorType` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `relation` MODIFY `actorRole` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `relation` MODIFY `description` text NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `opportunity` MODIFY `textID` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `actor_group` MODIFY `name` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `actor_group` MODIFY `description` text NULL'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `actor_group` MODIFY `description` varchar(250) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `actor_group` MODIFY `name` varchar(100) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `opportunity` MODIFY `textID` varchar(15) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `relation` MODIFY `description` varchar(400) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `relation` MODIFY `actorRole` varchar(100) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `relation` MODIFY `actorType` varchar(100) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `relation` MODIFY `actorName` varchar(100) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `relation` MODIFY `type` varchar(20) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `challenge` MODIFY `textID` varchar(15) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `challenge` MODIFY `name` varchar(100) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `ecoverse` MODIFY `name` varchar(100) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `aspect` MODIFY `framing` varchar(400) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `project` MODIFY `description` varchar(255) NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `project` MODIFY `textID` varchar(20) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `agreement` MODIFY `description` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `profile` MODIFY `description` varchar(400) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `profile` MODIFY `avatar` varchar(250) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `reference` MODIFY `description` varchar(300) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `reference` MODIFY `uri` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `context` MODIFY `who` varchar(2000) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `context` MODIFY `impact` varchar(2000) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `context` MODIFY `vision` varchar(2000) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `context` MODIFY `background` varchar(2000) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `context` MODIFY `tagline` varchar(250) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `actor` MODIFY `impact` varchar(250) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `actor` MODIFY `value` varchar(250) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `actor` MODIFY `description` varchar(250) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `actor` MODIFY `name` varchar(100) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` MODIFY `state` varchar(255) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` MODIFY `name` varchar(100) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` MODIFY `state` varchar(255) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` MODIFY `explanation` varchar(400) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `project` MODIFY `state` varchar(255) NULL'
    );
  }
}

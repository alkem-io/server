import { MigrationInterface, QueryRunner } from 'typeorm';

export class authrulesType1621961460004 implements MigrationInterface {
  name = 'authrulesType1621961460004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `credential` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `credential` ADD `authorizationRules` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` ADD `authorizationRules` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` ADD `authorizationRules` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` ADD `authorizationRules` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` ADD `authorizationRules` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `lifecycle` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `lifecycle` ADD `authorizationRules` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` ADD `authorizationRules` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `nvp` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `nvp` ADD `authorizationRules` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `application` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD `authorizationRules` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `community` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `community` ADD `authorizationRules` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD `authorizationRules` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` ADD `authorizationRules` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD `authorizationRules` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD `authorizationRules` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD `authorizationRules` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD `authorizationRules` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` ADD `authorizationRules` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `ecosystem_model` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecosystem_model` ADD `authorizationRules` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `context` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `context` ADD `authorizationRules` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `reference` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `reference` ADD `authorizationRules` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `profile` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `profile` ADD `authorizationRules` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `user` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD `authorizationRules` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `agent` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `agent` ADD `authorizationRules` text NOT NULL'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `agent` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `agent` ADD `authorizationRules` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `user` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD `authorizationRules` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `profile` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `profile` ADD `authorizationRules` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `reference` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `reference` ADD `authorizationRules` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `context` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `context` ADD `authorizationRules` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `ecosystem_model` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecosystem_model` ADD `authorizationRules` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` ADD `authorizationRules` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD `authorizationRules` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD `authorizationRules` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD `authorizationRules` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD `authorizationRules` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` ADD `authorizationRules` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD `authorizationRules` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `community` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `community` ADD `authorizationRules` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `application` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD `authorizationRules` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `nvp` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `nvp` ADD `authorizationRules` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` ADD `authorizationRules` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `lifecycle` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `lifecycle` ADD `authorizationRules` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` ADD `authorizationRules` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` ADD `authorizationRules` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` ADD `authorizationRules` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` ADD `authorizationRules` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `credential` DROP COLUMN `authorizationRules`'
    );
    await queryRunner.query(
      'ALTER TABLE `credential` ADD `authorizationRules` varchar(255) NOT NULL'
    );
  }
}

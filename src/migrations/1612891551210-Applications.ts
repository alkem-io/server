import { MigrationInterface, QueryRunner } from 'typeorm';

export class Applications1612891551210 implements MigrationInterface {
  name = 'Applications1612891551210';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `application` (`id` int NOT NULL AUTO_INCREMENT, `status` int NOT NULL, `reason` varchar(512) NULL, `userId` int NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `nvp` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, `value` varchar(255) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `application_questions` (`applicationId` int NOT NULL, `nvpId` int NOT NULL, INDEX `IDX_8495fae86f13836b0745642baa` (`applicationId`), INDEX `IDX_fe50118fd82e7fe2f74f986a19` (`nvpId`), PRIMARY KEY (`applicationId`, `nvpId`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `ecoverse_application` (`ecoverseId` int NOT NULL, `applicationId` int NOT NULL, INDEX `IDX_f5547fa10dd3b6da332aa91207` (`ecoverseId`), INDEX `IDX_700bffc25972d7ea5f87fc7811` (`applicationId`), PRIMARY KEY (`ecoverseId`, `applicationId`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `challenge_application` (`challengeId` int NOT NULL, `applicationId` int NOT NULL, INDEX `IDX_9a379678aad285bda1e1397e68` (`challengeId`), INDEX `IDX_0e31ef8f9f482bb2ddd52b4d99` (`applicationId`), PRIMARY KEY (`challengeId`, `applicationId`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `opportunity_application` (`opportunityId` int NOT NULL, `applicationId` int NOT NULL, INDEX `IDX_2e601d225a7aec383a078ffd61` (`opportunityId`), INDEX `IDX_6ef02c544fb92aab1acd30d8bb` (`applicationId`), PRIMARY KEY (`opportunityId`, `applicationId`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD CONSTRAINT `FK_b4ae3fea4a24b4be1a86dacf8a2` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `application_questions` ADD CONSTRAINT `FK_8495fae86f13836b0745642baa8` FOREIGN KEY (`applicationId`) REFERENCES `application`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `application_questions` ADD CONSTRAINT `FK_fe50118fd82e7fe2f74f986a195` FOREIGN KEY (`nvpId`) REFERENCES `nvp`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse_application` ADD CONSTRAINT `FK_f5547fa10dd3b6da332aa912074` FOREIGN KEY (`ecoverseId`) REFERENCES `ecoverse`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse_application` ADD CONSTRAINT `FK_700bffc25972d7ea5f87fc78118` FOREIGN KEY (`applicationId`) REFERENCES `application`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge_application` ADD CONSTRAINT `FK_9a379678aad285bda1e1397e684` FOREIGN KEY (`challengeId`) REFERENCES `challenge`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge_application` ADD CONSTRAINT `FK_0e31ef8f9f482bb2ddd52b4d99e` FOREIGN KEY (`applicationId`) REFERENCES `application`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity_application` ADD CONSTRAINT `FK_2e601d225a7aec383a078ffd610` FOREIGN KEY (`opportunityId`) REFERENCES `opportunity`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity_application` ADD CONSTRAINT `FK_6ef02c544fb92aab1acd30d8bb6` FOREIGN KEY (`applicationId`) REFERENCES `application`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `opportunity_application` DROP FOREIGN KEY `FK_6ef02c544fb92aab1acd30d8bb6`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity_application` DROP FOREIGN KEY `FK_2e601d225a7aec383a078ffd610`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge_application` DROP FOREIGN KEY `FK_0e31ef8f9f482bb2ddd52b4d99e`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge_application` DROP FOREIGN KEY `FK_9a379678aad285bda1e1397e684`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse_application` DROP FOREIGN KEY `FK_700bffc25972d7ea5f87fc78118`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse_application` DROP FOREIGN KEY `FK_f5547fa10dd3b6da332aa912074`'
    );
    await queryRunner.query(
      'ALTER TABLE `application_questions` DROP FOREIGN KEY `FK_fe50118fd82e7fe2f74f986a195`'
    );
    await queryRunner.query(
      'ALTER TABLE `application_questions` DROP FOREIGN KEY `FK_8495fae86f13836b0745642baa8`'
    );
    await queryRunner.query(
      'ALTER TABLE `application` DROP FOREIGN KEY `FK_b4ae3fea4a24b4be1a86dacf8a2`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_6ef02c544fb92aab1acd30d8bb` ON `opportunity_application`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_2e601d225a7aec383a078ffd61` ON `opportunity_application`'
    );
    await queryRunner.query('DROP TABLE `opportunity_application`');
    await queryRunner.query(
      'DROP INDEX `IDX_0e31ef8f9f482bb2ddd52b4d99` ON `challenge_application`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_9a379678aad285bda1e1397e68` ON `challenge_application`'
    );
    await queryRunner.query('DROP TABLE `challenge_application`');
    await queryRunner.query(
      'DROP INDEX `IDX_700bffc25972d7ea5f87fc7811` ON `ecoverse_application`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_f5547fa10dd3b6da332aa91207` ON `ecoverse_application`'
    );
    await queryRunner.query('DROP TABLE `ecoverse_application`');
    await queryRunner.query(
      'DROP INDEX `IDX_fe50118fd82e7fe2f74f986a19` ON `application_questions`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_8495fae86f13836b0745642baa` ON `application_questions`'
    );

    await queryRunner.query('DROP TABLE `application_questions`');
    await queryRunner.query('DROP TABLE `nvp`');
    await queryRunner.query('DROP TABLE `application`');
  }
}

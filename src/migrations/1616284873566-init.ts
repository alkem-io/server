import { MigrationInterface, QueryRunner } from 'typeorm';

export class init1616284873566 implements MigrationInterface {
  name = 'init1616284873566';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `did` (`id` int NOT NULL AUTO_INCREMENT, `DID` varchar(255) NOT NULL, `DDO` varchar(255) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      "CREATE TABLE `tagset` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL DEFAULT 'default', `tags` text NOT NULL, `profileId` int NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB"
    );
    await queryRunner.query(
      'CREATE TABLE `profile` (`id` int NOT NULL AUTO_INCREMENT, `avatar` text NULL, `description` text NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `reference` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, `uri` text NOT NULL, `description` text NULL, `contextId` int NULL, `profileId` int NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `context` (`id` int NOT NULL AUTO_INCREMENT, `tagline` varchar(255) NULL, `background` text NULL, `vision` text NULL, `impact` text NULL, `who` text NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `nvp` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, `value` varchar(255) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `actor` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, `description` text NULL, `value` text NULL, `impact` varchar(255) NULL, `actorGroupId` int NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `actor_group` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, `description` text NULL, `opportunityId` int NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `agreement` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, `description` text NULL, `projectId` int NULL, `tagsetId` int NULL, UNIQUE INDEX `REL_22348b89c2f802a3d75d52fbd5` (`tagsetId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `project` (`id` int NOT NULL AUTO_INCREMENT, `textID` varchar(255) NOT NULL, `name` varchar(255) NOT NULL, `description` text NULL, `state` varchar(255) NOT NULL, `tagsetId` int NULL, `opportunityId` int NULL, UNIQUE INDEX `REL_d07535c59062f86e887de8f0a5` (`tagsetId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `aspect` (`id` int NOT NULL AUTO_INCREMENT, `title` varchar(255) NOT NULL, `framing` text NOT NULL, `explanation` text NOT NULL, `opportunityId` int NULL, `projectId` int NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `relation` (`id` int NOT NULL AUTO_INCREMENT, `type` varchar(255) NOT NULL, `actorName` varchar(255) NOT NULL, `actorType` varchar(255) NOT NULL, `actorRole` varchar(255) NOT NULL, `description` text NULL, `opportunityId` int NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `opportunity` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, `textID` varchar(255) NOT NULL, `state` varchar(255) NOT NULL, `contextId` int NULL, `communityId` int NULL, `tagsetId` int NULL, `dIDId` int NULL, `challengeId` int NULL, UNIQUE INDEX `REL_9c169eb500e2d3823154c7b603` (`contextId`), UNIQUE INDEX `REL_1c7744df92f39ab567084fd8c0` (`communityId`), UNIQUE INDEX `REL_7d23d17ce61f11c92ff1ea0ed1` (`tagsetId`), UNIQUE INDEX `REL_cb4c7ef53da42d9759efaeb39e` (`dIDId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `community` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, `type` varchar(255) NOT NULL, `restrictedGroupNames` text NOT NULL, `parentCommunityId` int NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `application` (`id` int NOT NULL AUTO_INCREMENT, `status` int NOT NULL, `userId` int NULL, `communityId` int NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `user` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, `accountUpn` varchar(255) NOT NULL, `firstName` varchar(255) NOT NULL, `lastName` varchar(255) NOT NULL, `email` varchar(255) NOT NULL, `phone` varchar(255) NOT NULL, `city` varchar(255) NOT NULL, `country` varchar(255) NOT NULL, `gender` varchar(255) NOT NULL, `lastModified` int NOT NULL, `dIDId` int NULL, `profileId` int NULL, UNIQUE INDEX `REL_f27e03d1f7ce0724d8814fe841` (`dIDId`), UNIQUE INDEX `REL_9466682df91534dd95e4dbaa61` (`profileId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `user_group` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, `includeInSearch` tinyint NOT NULL, `focalPointId` int NULL, `profileId` int NULL, `organisationId` int NULL, `communityId` int NULL, UNIQUE INDEX `REL_9912e4cfc1e09848a392a65151` (`profileId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `organisation` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, `dIDId` int NULL, `profileId` int NULL, UNIQUE INDEX `REL_5e7d69b206e4aec1c4c2165563` (`dIDId`), UNIQUE INDEX `REL_037ba4b170844c039e74aa22ec` (`profileId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `ecoverse` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, `hostId` int NULL, `contextId` int NULL, `communityId` int NULL, `dIDId` int NULL, `tagsetId` int NULL, UNIQUE INDEX `REL_84d2ecca9924fb1b0d2fe2d2ad` (`hostId`), UNIQUE INDEX `REL_6db8627abbf00b1b986e359054` (`contextId`), UNIQUE INDEX `REL_f5ad15bcb06a95c2a109fbcce2` (`communityId`), UNIQUE INDEX `REL_f0198cf63a79ffc2bfab423249` (`dIDId`), UNIQUE INDEX `REL_3a69b0a6c67ead761763400990` (`tagsetId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `challenge` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, `textID` varchar(255) NOT NULL, `state` varchar(255) NOT NULL, `contextId` int NULL, `communityId` int NULL, `tagsetId` int NULL, `dIDId` int NULL, `ecoverseId` int NULL, UNIQUE INDEX `REL_1deebaabfc620e881858333b0d` (`contextId`), UNIQUE INDEX `REL_aa9668dd2340c2d794b414577b` (`communityId`), UNIQUE INDEX `REL_6b1bcaf365212806d8cc1f87b5` (`tagsetId`), UNIQUE INDEX `REL_b01faeff5b9c5d66d8c17abf52` (`dIDId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `application_questions` (`applicationId` int NOT NULL, `nvpId` int NOT NULL, INDEX `IDX_8495fae86f13836b0745642baa` (`applicationId`), INDEX `IDX_fe50118fd82e7fe2f74f986a19` (`nvpId`), PRIMARY KEY (`applicationId`, `nvpId`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `user_group_members` (`userGroupId` int NOT NULL, `userId` int NOT NULL, INDEX `IDX_294448f043349a3dc96e7ff955` (`userGroupId`), INDEX `IDX_25daa24c66b2de02898056f1eb` (`userId`), PRIMARY KEY (`userGroupId`, `userId`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `challenge_lead` (`challengeId` int NOT NULL, `organisationId` int NOT NULL, INDEX `IDX_f457c1ae9eea70a87435cac56d` (`challengeId`), INDEX `IDX_617eb0632402d30eb93e9a5f9e` (`organisationId`), PRIMARY KEY (`challengeId`, `organisationId`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` ADD CONSTRAINT `FK_81fc213b2d9ad0cddeab1a9ce64` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `reference` ADD CONSTRAINT `FK_07dbf4b02a078a59c216691f5eb` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `reference` ADD CONSTRAINT `FK_2f46c698fc4c19a8cc233c5f255` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` ADD CONSTRAINT `FK_0f9d41ee193d631a5439bb4f404` FOREIGN KEY (`actorGroupId`) REFERENCES `actor_group`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` ADD CONSTRAINT `FK_f03ac98cca44c86dbba5bbf484d` FOREIGN KEY (`opportunityId`) REFERENCES `opportunity`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` ADD CONSTRAINT `FK_8785b5a8510cabcc25d0f196783` FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` ADD CONSTRAINT `FK_22348b89c2f802a3d75d52fbd57` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_d07535c59062f86e887de8f0a57` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_35e34564793a27bb3c209a15245` FOREIGN KEY (`opportunityId`) REFERENCES `opportunity`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` ADD CONSTRAINT `FK_955e78c61028f1d478a0fd803ad` FOREIGN KEY (`opportunityId`) REFERENCES `opportunity`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` ADD CONSTRAINT `FK_37bfa2f3da493204ddc6e773e5a` FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` ADD CONSTRAINT `FK_d6d967126caae9df4c763985f9b` FOREIGN KEY (`opportunityId`) REFERENCES `opportunity`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_9c169eb500e2d3823154c7b603d` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_1c7744df92f39ab567084fd8c09` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_7d23d17ce61f11c92ff1ea0ed1a` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_cb4c7ef53da42d9759efaeb39e7` FOREIGN KEY (`dIDId`) REFERENCES `did`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_0e2c355dbb2950851dbc17a4490` FOREIGN KEY (`challengeId`) REFERENCES `challenge`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `community` ADD CONSTRAINT `FK_8e8283bdacc9e770918fe689333` FOREIGN KEY (`parentCommunityId`) REFERENCES `community`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD CONSTRAINT `FK_b4ae3fea4a24b4be1a86dacf8a2` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD CONSTRAINT `FK_500cee6f635849f50e19c7e2b76` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD CONSTRAINT `FK_f27e03d1f7ce0724d8814fe8411` FOREIGN KEY (`dIDId`) REFERENCES `did`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD CONSTRAINT `FK_9466682df91534dd95e4dbaa616` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_375df27b9233a3ffdd215bd1f86` FOREIGN KEY (`focalPointId`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_9912e4cfc1e09848a392a651514` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_2b8381df8c3a1680f50e4bc2351` FOREIGN KEY (`organisationId`) REFERENCES `organisation`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_9fcc131f256e969d773327f07cb` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` ADD CONSTRAINT `FK_5e7d69b206e4aec1c4c21655631` FOREIGN KEY (`dIDId`) REFERENCES `did`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` ADD CONSTRAINT `FK_037ba4b170844c039e74aa22ecd` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD CONSTRAINT `FK_84d2ecca9924fb1b0d2fe2d2ad6` FOREIGN KEY (`hostId`) REFERENCES `organisation`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD CONSTRAINT `FK_6db8627abbf00b1b986e359054f` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD CONSTRAINT `FK_f5ad15bcb06a95c2a109fbcce2a` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD CONSTRAINT `FK_f0198cf63a79ffc2bfab4232492` FOREIGN KEY (`dIDId`) REFERENCES `did`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD CONSTRAINT `FK_3a69b0a6c67ead7617634009903` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_1deebaabfc620e881858333b0d0` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_aa9668dd2340c2d794b414577b6` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_6b1bcaf365212806d8cc1f87b54` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_b01faeff5b9c5d66d8c17abf520` FOREIGN KEY (`dIDId`) REFERENCES `did`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_8b1aa813d89b3d64784367f1527` FOREIGN KEY (`ecoverseId`) REFERENCES `ecoverse`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `application_questions` ADD CONSTRAINT `FK_8495fae86f13836b0745642baa8` FOREIGN KEY (`applicationId`) REFERENCES `application`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `application_questions` ADD CONSTRAINT `FK_fe50118fd82e7fe2f74f986a195` FOREIGN KEY (`nvpId`) REFERENCES `nvp`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group_members` ADD CONSTRAINT `FK_294448f043349a3dc96e7ff9551` FOREIGN KEY (`userGroupId`) REFERENCES `user_group`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group_members` ADD CONSTRAINT `FK_25daa24c66b2de02898056f1ebe` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge_lead` ADD CONSTRAINT `FK_f457c1ae9eea70a87435cac56d6` FOREIGN KEY (`challengeId`) REFERENCES `challenge`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge_lead` ADD CONSTRAINT `FK_617eb0632402d30eb93e9a5f9e2` FOREIGN KEY (`organisationId`) REFERENCES `organisation`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'CREATE TABLE `cherrytwist`.`query-result-cache` (`id` int NOT NULL AUTO_INCREMENT, `identifier` varchar(255) NULL, `time` bigint NOT NULL, `duration` int NOT NULL, `query` text NOT NULL, `result` text NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `cherrytwist`.`query-result-cache`');
    await queryRunner.query(
      'ALTER TABLE `challenge_lead` DROP FOREIGN KEY `FK_617eb0632402d30eb93e9a5f9e2`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge_lead` DROP FOREIGN KEY `FK_f457c1ae9eea70a87435cac56d6`'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group_members` DROP FOREIGN KEY `FK_25daa24c66b2de02898056f1ebe`'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group_members` DROP FOREIGN KEY `FK_294448f043349a3dc96e7ff9551`'
    );
    await queryRunner.query(
      'ALTER TABLE `application_questions` DROP FOREIGN KEY `FK_fe50118fd82e7fe2f74f986a195`'
    );
    await queryRunner.query(
      'ALTER TABLE `application_questions` DROP FOREIGN KEY `FK_8495fae86f13836b0745642baa8`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_8b1aa813d89b3d64784367f1527`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_b01faeff5b9c5d66d8c17abf520`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_6b1bcaf365212806d8cc1f87b54`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_aa9668dd2340c2d794b414577b6`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_1deebaabfc620e881858333b0d0`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` DROP FOREIGN KEY `FK_3a69b0a6c67ead7617634009903`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` DROP FOREIGN KEY `FK_f0198cf63a79ffc2bfab4232492`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` DROP FOREIGN KEY `FK_f5ad15bcb06a95c2a109fbcce2a`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` DROP FOREIGN KEY `FK_6db8627abbf00b1b986e359054f`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` DROP FOREIGN KEY `FK_84d2ecca9924fb1b0d2fe2d2ad6`'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` DROP FOREIGN KEY `FK_037ba4b170844c039e74aa22ecd`'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` DROP FOREIGN KEY `FK_5e7d69b206e4aec1c4c21655631`'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_9fcc131f256e969d773327f07cb`'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_2b8381df8c3a1680f50e4bc2351`'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_9912e4cfc1e09848a392a651514`'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_375df27b9233a3ffdd215bd1f86`'
    );
    await queryRunner.query(
      'ALTER TABLE `user` DROP FOREIGN KEY `FK_9466682df91534dd95e4dbaa616`'
    );
    await queryRunner.query(
      'ALTER TABLE `user` DROP FOREIGN KEY `FK_f27e03d1f7ce0724d8814fe8411`'
    );
    await queryRunner.query(
      'ALTER TABLE `application` DROP FOREIGN KEY `FK_500cee6f635849f50e19c7e2b76`'
    );
    await queryRunner.query(
      'ALTER TABLE `application` DROP FOREIGN KEY `FK_b4ae3fea4a24b4be1a86dacf8a2`'
    );
    await queryRunner.query(
      'ALTER TABLE `community` DROP FOREIGN KEY `FK_8e8283bdacc9e770918fe689333`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_0e2c355dbb2950851dbc17a4490`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_cb4c7ef53da42d9759efaeb39e7`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_7d23d17ce61f11c92ff1ea0ed1a`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_1c7744df92f39ab567084fd8c09`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_9c169eb500e2d3823154c7b603d`'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` DROP FOREIGN KEY `FK_d6d967126caae9df4c763985f9b`'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` DROP FOREIGN KEY `FK_37bfa2f3da493204ddc6e773e5a`'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` DROP FOREIGN KEY `FK_955e78c61028f1d478a0fd803ad`'
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP FOREIGN KEY `FK_35e34564793a27bb3c209a15245`'
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP FOREIGN KEY `FK_d07535c59062f86e887de8f0a57`'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` DROP FOREIGN KEY `FK_22348b89c2f802a3d75d52fbd57`'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` DROP FOREIGN KEY `FK_8785b5a8510cabcc25d0f196783`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` DROP FOREIGN KEY `FK_f03ac98cca44c86dbba5bbf484d`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` DROP FOREIGN KEY `FK_0f9d41ee193d631a5439bb4f404`'
    );
    await queryRunner.query(
      'ALTER TABLE `reference` DROP FOREIGN KEY `FK_2f46c698fc4c19a8cc233c5f255`'
    );
    await queryRunner.query(
      'ALTER TABLE `reference` DROP FOREIGN KEY `FK_07dbf4b02a078a59c216691f5eb`'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` DROP FOREIGN KEY `FK_81fc213b2d9ad0cddeab1a9ce64`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_617eb0632402d30eb93e9a5f9e` ON `challenge_lead`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_f457c1ae9eea70a87435cac56d` ON `challenge_lead`'
    );
    await queryRunner.query('DROP TABLE `challenge_lead`');
    await queryRunner.query(
      'DROP INDEX `IDX_25daa24c66b2de02898056f1eb` ON `user_group_members`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_294448f043349a3dc96e7ff955` ON `user_group_members`'
    );
    await queryRunner.query('DROP TABLE `user_group_members`');
    await queryRunner.query(
      'DROP INDEX `IDX_fe50118fd82e7fe2f74f986a19` ON `application_questions`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_8495fae86f13836b0745642baa` ON `application_questions`'
    );
    await queryRunner.query('DROP TABLE `application_questions`');
    await queryRunner.query(
      'DROP INDEX `REL_b01faeff5b9c5d66d8c17abf52` ON `challenge`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_6b1bcaf365212806d8cc1f87b5` ON `challenge`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_aa9668dd2340c2d794b414577b` ON `challenge`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_1deebaabfc620e881858333b0d` ON `challenge`'
    );
    await queryRunner.query('DROP TABLE `challenge`');
    await queryRunner.query(
      'DROP INDEX `REL_3a69b0a6c67ead761763400990` ON `ecoverse`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_f0198cf63a79ffc2bfab423249` ON `ecoverse`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_f5ad15bcb06a95c2a109fbcce2` ON `ecoverse`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_6db8627abbf00b1b986e359054` ON `ecoverse`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_84d2ecca9924fb1b0d2fe2d2ad` ON `ecoverse`'
    );
    await queryRunner.query('DROP TABLE `ecoverse`');
    await queryRunner.query(
      'DROP INDEX `REL_037ba4b170844c039e74aa22ec` ON `organisation`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_5e7d69b206e4aec1c4c2165563` ON `organisation`'
    );
    await queryRunner.query('DROP TABLE `organisation`');
    await queryRunner.query(
      'DROP INDEX `REL_9912e4cfc1e09848a392a65151` ON `user_group`'
    );
    await queryRunner.query('DROP TABLE `user_group`');
    await queryRunner.query(
      'DROP INDEX `REL_9466682df91534dd95e4dbaa61` ON `user`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_f27e03d1f7ce0724d8814fe841` ON `user`'
    );
    await queryRunner.query('DROP TABLE `user`');
    await queryRunner.query('DROP TABLE `application`');
    await queryRunner.query('DROP TABLE `community`');
    await queryRunner.query(
      'DROP INDEX `REL_cb4c7ef53da42d9759efaeb39e` ON `opportunity`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_7d23d17ce61f11c92ff1ea0ed1` ON `opportunity`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_1c7744df92f39ab567084fd8c0` ON `opportunity`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_9c169eb500e2d3823154c7b603` ON `opportunity`'
    );
    await queryRunner.query('DROP TABLE `opportunity`');
    await queryRunner.query('DROP TABLE `relation`');
    await queryRunner.query('DROP TABLE `aspect`');
    await queryRunner.query(
      'DROP INDEX `REL_d07535c59062f86e887de8f0a5` ON `project`'
    );
    await queryRunner.query('DROP TABLE `project`');
    await queryRunner.query(
      'DROP INDEX `REL_22348b89c2f802a3d75d52fbd5` ON `agreement`'
    );
    await queryRunner.query('DROP TABLE `agreement`');
    await queryRunner.query('DROP TABLE `actor_group`');
    await queryRunner.query('DROP TABLE `actor`');
    await queryRunner.query('DROP TABLE `nvp`');
    await queryRunner.query('DROP TABLE `context`');
    await queryRunner.query('DROP TABLE `reference`');
    await queryRunner.query('DROP TABLE `profile`');
    await queryRunner.query('DROP TABLE `tagset`');
    await queryRunner.query('DROP TABLE `did`');
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class publicPreview1624374908296 implements MigrationInterface {
  name = 'publicPreview1624374908296';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `credential` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `resourceID` varchar(255) NOT NULL, `type` varchar(255) NOT NULL, `agentId` varchar(36) NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `authorization_definition` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `credentialRules` text NOT NULL, `verifiedCredentialRules` text NOT NULL, `anonymousReadAccess` tinyint NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `agent` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `parentDisplayID` text NULL, `did` varchar(255) NULL, `password` varchar(255) NULL, `authorizationId` varchar(36) NULL, UNIQUE INDEX `REL_8ed9d1af584fa62f1ad3405b33` (`authorizationId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `actor` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `name` varchar(255) NOT NULL, `description` text NULL, `value` text NULL, `impact` varchar(255) NULL, `authorizationId` varchar(36) NULL, `actorGroupId` varchar(36) NULL, UNIQUE INDEX `REL_a2afa3851ea733de932251b3a1` (`authorizationId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `actor_group` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `name` varchar(255) NOT NULL, `description` text NULL, `authorizationId` varchar(36) NULL, `ecosystemModelId` varchar(36) NULL, UNIQUE INDEX `REL_bde98d59e8984e7d17034c3b93` (`authorizationId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `ecosystem_model` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `description` varchar(255) NULL, `authorizationId` varchar(36) NULL, UNIQUE INDEX `REL_658580aea4e1a892227e27db90` (`authorizationId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `aspect` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `title` varchar(255) NOT NULL, `framing` text NOT NULL, `explanation` text NOT NULL, `authorizationId` varchar(36) NULL, `contextId` varchar(36) NULL, UNIQUE INDEX `REL_c52470717008d58ec6d76b12ff` (`authorizationId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `visual` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `avatar` text NOT NULL, `background` text NOT NULL, `banner` text NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `context` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `tagline` varchar(255) NULL, `background` text NULL, `vision` text NULL, `impact` text NULL, `who` text NULL, `authorizationId` varchar(36) NULL, `ecosystemModelId` varchar(36) NULL, `visualId` varchar(36) NULL, UNIQUE INDEX `REL_5f0dbc3b097ef297bd5f4ddb1a` (`authorizationId`), UNIQUE INDEX `REL_a03169c3f86480ba3863924f4d` (`ecosystemModelId`), UNIQUE INDEX `REL_9dd986ff532f7e2447ffe4934d` (`visualId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `reference` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `name` varchar(255) NOT NULL, `uri` text NOT NULL, `description` text NULL, `authorizationId` varchar(36) NULL, `contextId` varchar(36) NULL, `profileId` varchar(36) NULL, UNIQUE INDEX `REL_73e8ae665a49366ca7e2866a45` (`authorizationId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `profile` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `avatar` text NULL, `description` text NULL, `authorizationId` varchar(36) NULL, UNIQUE INDEX `REL_a96475631aba7dce41db03cc8b` (`authorizationId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      "CREATE TABLE `tagset` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `name` varchar(255) NOT NULL DEFAULT 'default', `tags` text NOT NULL, `authorizationId` varchar(36) NULL, `profileId` varchar(36) NULL, UNIQUE INDEX `REL_eb59b98ee6ef26c993d0d75c83` (`authorizationId`), PRIMARY KEY (`id`)) ENGINE=InnoDB"
    );
    await queryRunner.query(
      'CREATE TABLE `lifecycle` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `machineState` text NULL, `machineDef` text NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `organisation` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `displayName` varchar(255) NOT NULL, `nameID` varchar(255) NOT NULL, `authorizationId` varchar(36) NULL, `profileId` varchar(36) NULL, `agentId` varchar(36) NULL, UNIQUE INDEX `REL_badc07674ce4e44801e5a5f36c` (`authorizationId`), UNIQUE INDEX `REL_037ba4b170844c039e74aa22ec` (`profileId`), UNIQUE INDEX `REL_7671a7e33f6665764f4534a596` (`agentId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `user_group` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `name` varchar(255) NOT NULL, `ecoverseID` varchar(255) NOT NULL, `authorizationId` varchar(36) NULL, `profileId` varchar(36) NULL, `organisationId` varchar(36) NULL, `communityId` varchar(36) NULL, UNIQUE INDEX `REL_e8e32f1e59c349b406a4752e54` (`authorizationId`), UNIQUE INDEX `REL_9912e4cfc1e09848a392a65151` (`profileId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `nvp` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `name` varchar(255) NOT NULL, `value` varchar(255) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `user` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `displayName` varchar(255) NOT NULL, `nameID` varchar(255) NOT NULL, `accountUpn` varchar(255) NOT NULL, `firstName` varchar(255) NOT NULL, `lastName` varchar(255) NOT NULL, `email` varchar(255) NOT NULL, `phone` varchar(255) NOT NULL, `city` varchar(255) NOT NULL, `country` varchar(255) NOT NULL, `gender` varchar(255) NOT NULL, `authorizationId` varchar(36) NULL, `profileId` varchar(36) NULL, `agentId` varchar(36) NULL, UNIQUE INDEX `REL_09f909622aa177a097256b7cc2` (`authorizationId`), UNIQUE INDEX `REL_9466682df91534dd95e4dbaa61` (`profileId`), UNIQUE INDEX `REL_b61c694cacfab25533bd23d9ad` (`agentId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `application` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `ecoverseID` varchar(255) NOT NULL, `authorizationId` varchar(36) NULL, `lifecycleId` varchar(36) NULL, `userId` varchar(36) NULL, `communityId` varchar(36) NULL, UNIQUE INDEX `REL_56f5614fff0028d40370499582` (`authorizationId`), UNIQUE INDEX `REL_7ec2857c7d8d16432ffca1cb3d` (`lifecycleId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `community` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `displayName` varchar(255) NOT NULL, `ecoverseID` varchar(255) NOT NULL, `authorizationId` varchar(36) NULL, `credentialId` varchar(36) NULL, `parentCommunityId` varchar(36) NULL, UNIQUE INDEX `REL_6e7584bfb417bd0f8e8696ab58` (`authorizationId`), UNIQUE INDEX `REL_973fe78e64b8a79056d58ead43` (`credentialId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `ecoverse` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `displayName` varchar(255) NOT NULL, `nameID` varchar(255) NOT NULL, `authorizationId` varchar(36) NULL, `contextId` varchar(36) NULL, `communityId` varchar(36) NULL, `lifecycleId` varchar(36) NULL, `tagsetId` varchar(36) NULL, `agentId` varchar(36) NULL, UNIQUE INDEX `REL_17a161eef37c9f07186532ab75` (`authorizationId`), UNIQUE INDEX `REL_6db8627abbf00b1b986e359054` (`contextId`), UNIQUE INDEX `REL_f5ad15bcb06a95c2a109fbcce2` (`communityId`), UNIQUE INDEX `REL_ec1a68698d32f610a5fc1880c7` (`lifecycleId`), UNIQUE INDEX `REL_3a69b0a6c67ead761763400990` (`tagsetId`), UNIQUE INDEX `REL_b0c3f360534db92017e36a00bb` (`agentId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `relation` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `type` varchar(255) NOT NULL, `actorName` varchar(255) NOT NULL, `actorType` varchar(255) NOT NULL, `actorRole` varchar(255) NOT NULL, `description` text NULL, `authorizationId` varchar(36) NULL, `opportunityId` varchar(36) NULL, UNIQUE INDEX `REL_53fccd56207915b969b91834e0` (`authorizationId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `agreement` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `name` varchar(255) NOT NULL, `description` text NULL, `projectId` varchar(36) NULL, `tagsetId` varchar(36) NULL, UNIQUE INDEX `REL_22348b89c2f802a3d75d52fbd5` (`tagsetId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `project` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `displayName` varchar(255) NOT NULL, `nameID` varchar(255) NOT NULL, `ecoverseID` varchar(255) NOT NULL, `description` text NULL, `authorizationId` varchar(36) NULL, `lifecycleId` varchar(36) NULL, `tagsetId` varchar(36) NULL, `opportunityId` varchar(36) NULL, UNIQUE INDEX `REL_fac8673f44e6b295e30d1c1739` (`authorizationId`), UNIQUE INDEX `REL_f425931bb61a95ef6f6d89c9a8` (`lifecycleId`), UNIQUE INDEX `REL_d07535c59062f86e887de8f0a5` (`tagsetId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `opportunity` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `displayName` varchar(255) NOT NULL, `nameID` varchar(255) NOT NULL, `ecoverseID` varchar(255) NOT NULL, `authorizationId` varchar(36) NULL, `contextId` varchar(36) NULL, `communityId` varchar(36) NULL, `lifecycleId` varchar(36) NULL, `tagsetId` varchar(36) NULL, `agentId` varchar(36) NULL, `challengeId` varchar(36) NULL, UNIQUE INDEX `REL_a344b754f33792cbbc58e41e89` (`authorizationId`), UNIQUE INDEX `REL_9c169eb500e2d3823154c7b603` (`contextId`), UNIQUE INDEX `REL_1c7744df92f39ab567084fd8c0` (`communityId`), UNIQUE INDEX `REL_6860f1e3ae5509245bdb5c401f` (`lifecycleId`), UNIQUE INDEX `REL_7d23d17ce61f11c92ff1ea0ed1` (`tagsetId`), UNIQUE INDEX `REL_c814aa7dc8a68f27d96d5d1782` (`agentId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `challenge` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `displayName` varchar(255) NOT NULL, `nameID` varchar(255) NOT NULL, `ecoverseID` varchar(255) NOT NULL, `authorizationId` varchar(36) NULL, `contextId` varchar(36) NULL, `communityId` varchar(36) NULL, `lifecycleId` varchar(36) NULL, `tagsetId` varchar(36) NULL, `agentId` varchar(36) NULL, `parentChallengeId` varchar(36) NULL, `parentEcoverseId` varchar(36) NULL, UNIQUE INDEX `REL_178fa41e46fd331f3501a62f6b` (`authorizationId`), UNIQUE INDEX `REL_1deebaabfc620e881858333b0d` (`contextId`), UNIQUE INDEX `REL_aa9668dd2340c2d794b414577b` (`communityId`), UNIQUE INDEX `REL_3c535130cde781b69259eec7d8` (`lifecycleId`), UNIQUE INDEX `REL_6b1bcaf365212806d8cc1f87b5` (`tagsetId`), UNIQUE INDEX `REL_b025a2720e5ee0e5b38774f7a8` (`agentId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `application_questions` (`applicationId` varchar(36) NOT NULL, `nvpId` varchar(36) NOT NULL, INDEX `IDX_8495fae86f13836b0745642baa` (`applicationId`), INDEX `IDX_fe50118fd82e7fe2f74f986a19` (`nvpId`), PRIMARY KEY (`applicationId`, `nvpId`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'ALTER TABLE `credential` ADD CONSTRAINT `FK_dbe0929355f82e5995f0b7fd5e2` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `agent` ADD CONSTRAINT `FK_8ed9d1af584fa62f1ad3405b33b` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` ADD CONSTRAINT `FK_a2afa3851ea733de932251b3a1f` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` ADD CONSTRAINT `FK_0f9d41ee193d631a5439bb4f404` FOREIGN KEY (`actorGroupId`) REFERENCES `actor_group`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` ADD CONSTRAINT `FK_bde98d59e8984e7d17034c3b937` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` ADD CONSTRAINT `FK_cbb1d7afa052a184471723d3297` FOREIGN KEY (`ecosystemModelId`) REFERENCES `ecosystem_model`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecosystem_model` ADD CONSTRAINT `FK_658580aea4e1a892227e27db902` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` ADD CONSTRAINT `FK_c52470717008d58ec6d76b12ffa` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` ADD CONSTRAINT `FK_6c57bb50b3b6fb4943c807c83ce` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `context` ADD CONSTRAINT `FK_5f0dbc3b097ef297bd5f4ddb1a9` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `context` ADD CONSTRAINT `FK_a03169c3f86480ba3863924f4d7` FOREIGN KEY (`ecosystemModelId`) REFERENCES `ecosystem_model`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `context` ADD CONSTRAINT `FK_9dd986ff532f7e2447ffe4934d2` FOREIGN KEY (`visualId`) REFERENCES `visual`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `reference` ADD CONSTRAINT `FK_73e8ae665a49366ca7e2866a45d` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `reference` ADD CONSTRAINT `FK_07dbf4b02a078a59c216691f5eb` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `reference` ADD CONSTRAINT `FK_2f46c698fc4c19a8cc233c5f255` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `profile` ADD CONSTRAINT `FK_a96475631aba7dce41db03cc8b2` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` ADD CONSTRAINT `FK_eb59b98ee6ef26c993d0d75c83c` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` ADD CONSTRAINT `FK_81fc213b2d9ad0cddeab1a9ce64` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` ADD CONSTRAINT `FK_badc07674ce4e44801e5a5f36ce` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` ADD CONSTRAINT `FK_037ba4b170844c039e74aa22ecd` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` ADD CONSTRAINT `FK_7671a7e33f6665764f4534a5967` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_e8e32f1e59c349b406a4752e545` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_9912e4cfc1e09848a392a651514` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_2b8381df8c3a1680f50e4bc2351` FOREIGN KEY (`organisationId`) REFERENCES `organisation`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_9fcc131f256e969d773327f07cb` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD CONSTRAINT `FK_09f909622aa177a097256b7cc22` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD CONSTRAINT `FK_9466682df91534dd95e4dbaa616` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD CONSTRAINT `FK_b61c694cacfab25533bd23d9add` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD CONSTRAINT `FK_56f5614fff0028d403704995822` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD CONSTRAINT `FK_7ec2857c7d8d16432ffca1cb3d9` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD CONSTRAINT `FK_b4ae3fea4a24b4be1a86dacf8a2` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD CONSTRAINT `FK_500cee6f635849f50e19c7e2b76` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `community` ADD CONSTRAINT `FK_6e7584bfb417bd0f8e8696ab585` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `community` ADD CONSTRAINT `FK_973fe78e64b8a79056d58ead433` FOREIGN KEY (`credentialId`) REFERENCES `credential`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `community` ADD CONSTRAINT `FK_8e8283bdacc9e770918fe689333` FOREIGN KEY (`parentCommunityId`) REFERENCES `community`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD CONSTRAINT `FK_17a161eef37c9f07186532ab758` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD CONSTRAINT `FK_6db8627abbf00b1b986e359054f` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD CONSTRAINT `FK_f5ad15bcb06a95c2a109fbcce2a` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD CONSTRAINT `FK_ec1a68698d32f610a5fc1880c7f` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD CONSTRAINT `FK_3a69b0a6c67ead7617634009903` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD CONSTRAINT `FK_b0c3f360534db92017e36a00bb2` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` ADD CONSTRAINT `FK_53fccd56207915b969b91834e04` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` ADD CONSTRAINT `FK_d6d967126caae9df4c763985f9b` FOREIGN KEY (`opportunityId`) REFERENCES `opportunity`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` ADD CONSTRAINT `FK_8785b5a8510cabcc25d0f196783` FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` ADD CONSTRAINT `FK_22348b89c2f802a3d75d52fbd57` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_fac8673f44e6b295e30d1c1739a` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_f425931bb61a95ef6f6d89c9a85` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_d07535c59062f86e887de8f0a57` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_35e34564793a27bb3c209a15245` FOREIGN KEY (`opportunityId`) REFERENCES `opportunity`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_a344b754f33792cbbc58e41e898` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_9c169eb500e2d3823154c7b603d` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_1c7744df92f39ab567084fd8c09` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_6860f1e3ae5509245bdb5c401f3` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_7d23d17ce61f11c92ff1ea0ed1a` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_c814aa7dc8a68f27d96d5d1782c` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_0e2c355dbb2950851dbc17a4490` FOREIGN KEY (`challengeId`) REFERENCES `challenge`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_178fa41e46fd331f3501a62f6bf` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_1deebaabfc620e881858333b0d0` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_aa9668dd2340c2d794b414577b6` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_3c535130cde781b69259eec7d85` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_6b1bcaf365212806d8cc1f87b54` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_b025a2720e5ee0e5b38774f7a8c` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_7d2b222d54b900071b0959f03ef` FOREIGN KEY (`parentChallengeId`) REFERENCES `challenge`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_494b27cb13b59128fb24b365ca6` FOREIGN KEY (`parentEcoverseId`) REFERENCES `ecoverse`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `application_questions` ADD CONSTRAINT `FK_8495fae86f13836b0745642baa8` FOREIGN KEY (`applicationId`) REFERENCES `application`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `application_questions` ADD CONSTRAINT `FK_fe50118fd82e7fe2f74f986a195` FOREIGN KEY (`nvpId`) REFERENCES `nvp`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'CREATE TABLE `query-result-cache` (`id` int NOT NULL AUTO_INCREMENT, `identifier` varchar(255) NULL, `time` bigint NOT NULL, `duration` int NOT NULL, `query` text NOT NULL, `result` text NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `query-result-cache`');
    await queryRunner.query(
      'ALTER TABLE `application_questions` DROP FOREIGN KEY `FK_fe50118fd82e7fe2f74f986a195`'
    );
    await queryRunner.query(
      'ALTER TABLE `application_questions` DROP FOREIGN KEY `FK_8495fae86f13836b0745642baa8`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_494b27cb13b59128fb24b365ca6`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_7d2b222d54b900071b0959f03ef`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_b025a2720e5ee0e5b38774f7a8c`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_6b1bcaf365212806d8cc1f87b54`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_3c535130cde781b69259eec7d85`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_aa9668dd2340c2d794b414577b6`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_1deebaabfc620e881858333b0d0`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_178fa41e46fd331f3501a62f6bf`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_0e2c355dbb2950851dbc17a4490`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_c814aa7dc8a68f27d96d5d1782c`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_7d23d17ce61f11c92ff1ea0ed1a`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_6860f1e3ae5509245bdb5c401f3`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_1c7744df92f39ab567084fd8c09`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_9c169eb500e2d3823154c7b603d`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_a344b754f33792cbbc58e41e898`'
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP FOREIGN KEY `FK_35e34564793a27bb3c209a15245`'
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP FOREIGN KEY `FK_d07535c59062f86e887de8f0a57`'
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP FOREIGN KEY `FK_f425931bb61a95ef6f6d89c9a85`'
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP FOREIGN KEY `FK_fac8673f44e6b295e30d1c1739a`'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` DROP FOREIGN KEY `FK_22348b89c2f802a3d75d52fbd57`'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` DROP FOREIGN KEY `FK_8785b5a8510cabcc25d0f196783`'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` DROP FOREIGN KEY `FK_d6d967126caae9df4c763985f9b`'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` DROP FOREIGN KEY `FK_53fccd56207915b969b91834e04`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` DROP FOREIGN KEY `FK_b0c3f360534db92017e36a00bb2`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` DROP FOREIGN KEY `FK_3a69b0a6c67ead7617634009903`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` DROP FOREIGN KEY `FK_ec1a68698d32f610a5fc1880c7f`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` DROP FOREIGN KEY `FK_f5ad15bcb06a95c2a109fbcce2a`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` DROP FOREIGN KEY `FK_6db8627abbf00b1b986e359054f`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` DROP FOREIGN KEY `FK_17a161eef37c9f07186532ab758`'
    );
    await queryRunner.query(
      'ALTER TABLE `community` DROP FOREIGN KEY `FK_8e8283bdacc9e770918fe689333`'
    );
    await queryRunner.query(
      'ALTER TABLE `community` DROP FOREIGN KEY `FK_973fe78e64b8a79056d58ead433`'
    );
    await queryRunner.query(
      'ALTER TABLE `community` DROP FOREIGN KEY `FK_6e7584bfb417bd0f8e8696ab585`'
    );
    await queryRunner.query(
      'ALTER TABLE `application` DROP FOREIGN KEY `FK_500cee6f635849f50e19c7e2b76`'
    );
    await queryRunner.query(
      'ALTER TABLE `application` DROP FOREIGN KEY `FK_b4ae3fea4a24b4be1a86dacf8a2`'
    );
    await queryRunner.query(
      'ALTER TABLE `application` DROP FOREIGN KEY `FK_7ec2857c7d8d16432ffca1cb3d9`'
    );
    await queryRunner.query(
      'ALTER TABLE `application` DROP FOREIGN KEY `FK_56f5614fff0028d403704995822`'
    );
    await queryRunner.query(
      'ALTER TABLE `user` DROP FOREIGN KEY `FK_b61c694cacfab25533bd23d9add`'
    );
    await queryRunner.query(
      'ALTER TABLE `user` DROP FOREIGN KEY `FK_9466682df91534dd95e4dbaa616`'
    );
    await queryRunner.query(
      'ALTER TABLE `user` DROP FOREIGN KEY `FK_09f909622aa177a097256b7cc22`'
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
      'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_e8e32f1e59c349b406a4752e545`'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` DROP FOREIGN KEY `FK_7671a7e33f6665764f4534a5967`'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` DROP FOREIGN KEY `FK_037ba4b170844c039e74aa22ecd`'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` DROP FOREIGN KEY `FK_badc07674ce4e44801e5a5f36ce`'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` DROP FOREIGN KEY `FK_81fc213b2d9ad0cddeab1a9ce64`'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` DROP FOREIGN KEY `FK_eb59b98ee6ef26c993d0d75c83c`'
    );
    await queryRunner.query(
      'ALTER TABLE `profile` DROP FOREIGN KEY `FK_a96475631aba7dce41db03cc8b2`'
    );
    await queryRunner.query(
      'ALTER TABLE `reference` DROP FOREIGN KEY `FK_2f46c698fc4c19a8cc233c5f255`'
    );
    await queryRunner.query(
      'ALTER TABLE `reference` DROP FOREIGN KEY `FK_07dbf4b02a078a59c216691f5eb`'
    );
    await queryRunner.query(
      'ALTER TABLE `reference` DROP FOREIGN KEY `FK_73e8ae665a49366ca7e2866a45d`'
    );
    await queryRunner.query(
      'ALTER TABLE `context` DROP FOREIGN KEY `FK_9dd986ff532f7e2447ffe4934d2`'
    );
    await queryRunner.query(
      'ALTER TABLE `context` DROP FOREIGN KEY `FK_a03169c3f86480ba3863924f4d7`'
    );
    await queryRunner.query(
      'ALTER TABLE `context` DROP FOREIGN KEY `FK_5f0dbc3b097ef297bd5f4ddb1a9`'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` DROP FOREIGN KEY `FK_6c57bb50b3b6fb4943c807c83ce`'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` DROP FOREIGN KEY `FK_c52470717008d58ec6d76b12ffa`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecosystem_model` DROP FOREIGN KEY `FK_658580aea4e1a892227e27db902`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` DROP FOREIGN KEY `FK_cbb1d7afa052a184471723d3297`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` DROP FOREIGN KEY `FK_bde98d59e8984e7d17034c3b937`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` DROP FOREIGN KEY `FK_0f9d41ee193d631a5439bb4f404`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` DROP FOREIGN KEY `FK_a2afa3851ea733de932251b3a1f`'
    );
    await queryRunner.query(
      'ALTER TABLE `agent` DROP FOREIGN KEY `FK_8ed9d1af584fa62f1ad3405b33b`'
    );
    await queryRunner.query(
      'ALTER TABLE `credential` DROP FOREIGN KEY `FK_dbe0929355f82e5995f0b7fd5e2`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_fe50118fd82e7fe2f74f986a19` ON `application_questions`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_8495fae86f13836b0745642baa` ON `application_questions`'
    );
    await queryRunner.query('DROP TABLE `application_questions`');
    await queryRunner.query(
      'DROP INDEX `REL_b025a2720e5ee0e5b38774f7a8` ON `challenge`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_6b1bcaf365212806d8cc1f87b5` ON `challenge`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_3c535130cde781b69259eec7d8` ON `challenge`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_aa9668dd2340c2d794b414577b` ON `challenge`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_1deebaabfc620e881858333b0d` ON `challenge`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_178fa41e46fd331f3501a62f6b` ON `challenge`'
    );
    await queryRunner.query('DROP TABLE `challenge`');
    await queryRunner.query(
      'DROP INDEX `REL_c814aa7dc8a68f27d96d5d1782` ON `opportunity`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_7d23d17ce61f11c92ff1ea0ed1` ON `opportunity`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_6860f1e3ae5509245bdb5c401f` ON `opportunity`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_1c7744df92f39ab567084fd8c0` ON `opportunity`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_9c169eb500e2d3823154c7b603` ON `opportunity`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_a344b754f33792cbbc58e41e89` ON `opportunity`'
    );
    await queryRunner.query('DROP TABLE `opportunity`');
    await queryRunner.query(
      'DROP INDEX `REL_d07535c59062f86e887de8f0a5` ON `project`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_f425931bb61a95ef6f6d89c9a8` ON `project`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_fac8673f44e6b295e30d1c1739` ON `project`'
    );
    await queryRunner.query('DROP TABLE `project`');
    await queryRunner.query(
      'DROP INDEX `REL_22348b89c2f802a3d75d52fbd5` ON `agreement`'
    );
    await queryRunner.query('DROP TABLE `agreement`');
    await queryRunner.query(
      'DROP INDEX `REL_53fccd56207915b969b91834e0` ON `relation`'
    );
    await queryRunner.query('DROP TABLE `relation`');
    await queryRunner.query(
      'DROP INDEX `REL_b0c3f360534db92017e36a00bb` ON `ecoverse`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_3a69b0a6c67ead761763400990` ON `ecoverse`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_ec1a68698d32f610a5fc1880c7` ON `ecoverse`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_f5ad15bcb06a95c2a109fbcce2` ON `ecoverse`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_6db8627abbf00b1b986e359054` ON `ecoverse`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_17a161eef37c9f07186532ab75` ON `ecoverse`'
    );
    await queryRunner.query('DROP TABLE `ecoverse`');
    await queryRunner.query(
      'DROP INDEX `REL_973fe78e64b8a79056d58ead43` ON `community`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_6e7584bfb417bd0f8e8696ab58` ON `community`'
    );
    await queryRunner.query('DROP TABLE `community`');
    await queryRunner.query(
      'DROP INDEX `REL_7ec2857c7d8d16432ffca1cb3d` ON `application`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_56f5614fff0028d40370499582` ON `application`'
    );
    await queryRunner.query('DROP TABLE `application`');
    await queryRunner.query(
      'DROP INDEX `REL_b61c694cacfab25533bd23d9ad` ON `user`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_9466682df91534dd95e4dbaa61` ON `user`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_09f909622aa177a097256b7cc2` ON `user`'
    );
    await queryRunner.query('DROP TABLE `user`');
    await queryRunner.query('DROP TABLE `nvp`');
    await queryRunner.query(
      'DROP INDEX `REL_9912e4cfc1e09848a392a65151` ON `user_group`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_e8e32f1e59c349b406a4752e54` ON `user_group`'
    );
    await queryRunner.query('DROP TABLE `user_group`');
    await queryRunner.query(
      'DROP INDEX `REL_7671a7e33f6665764f4534a596` ON `organisation`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_037ba4b170844c039e74aa22ec` ON `organisation`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_badc07674ce4e44801e5a5f36c` ON `organisation`'
    );
    await queryRunner.query('DROP TABLE `organisation`');
    await queryRunner.query('DROP TABLE `lifecycle`');
    await queryRunner.query(
      'DROP INDEX `REL_eb59b98ee6ef26c993d0d75c83` ON `tagset`'
    );
    await queryRunner.query('DROP TABLE `tagset`');
    await queryRunner.query(
      'DROP INDEX `REL_a96475631aba7dce41db03cc8b` ON `profile`'
    );
    await queryRunner.query('DROP TABLE `profile`');
    await queryRunner.query(
      'DROP INDEX `REL_73e8ae665a49366ca7e2866a45` ON `reference`'
    );
    await queryRunner.query('DROP TABLE `reference`');
    await queryRunner.query(
      'DROP INDEX `REL_9dd986ff532f7e2447ffe4934d` ON `context`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_a03169c3f86480ba3863924f4d` ON `context`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_5f0dbc3b097ef297bd5f4ddb1a` ON `context`'
    );
    await queryRunner.query('DROP TABLE `context`');
    await queryRunner.query('DROP TABLE `visual`');
    await queryRunner.query(
      'DROP INDEX `REL_c52470717008d58ec6d76b12ff` ON `aspect`'
    );
    await queryRunner.query('DROP TABLE `aspect`');
    await queryRunner.query(
      'DROP INDEX `REL_658580aea4e1a892227e27db90` ON `ecosystem_model`'
    );
    await queryRunner.query('DROP TABLE `ecosystem_model`');
    await queryRunner.query(
      'DROP INDEX `REL_bde98d59e8984e7d17034c3b93` ON `actor_group`'
    );
    await queryRunner.query('DROP TABLE `actor_group`');
    await queryRunner.query(
      'DROP INDEX `REL_a2afa3851ea733de932251b3a1` ON `actor`'
    );
    await queryRunner.query('DROP TABLE `actor`');
    await queryRunner.query(
      'DROP INDEX `REL_8ed9d1af584fa62f1ad3405b33` ON `agent`'
    );
    await queryRunner.query('DROP TABLE `agent`');
    await queryRunner.query('DROP TABLE `authorization_definition`');
    await queryRunner.query('DROP TABLE `credential`');
  }
}

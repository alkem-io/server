import { MigrationInterface, QueryRunner } from 'typeorm';

export class onDelete1624339840928 implements MigrationInterface {
  name = 'onDelete1624339840928';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `credential` DROP FOREIGN KEY `FK_dbe0929355f82e5995f0b7fd5e2`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` DROP FOREIGN KEY `FK_0f9d41ee193d631a5439bb4f404`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` DROP FOREIGN KEY `FK_cbb1d7afa052a184471723d3297`'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` DROP FOREIGN KEY `FK_81fc213b2d9ad0cddeab1a9ce64`'
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
      'ALTER TABLE `application` DROP FOREIGN KEY `FK_7ec2857c7d8d16432ffca1cb3d9`'
    );
    await queryRunner.query(
      'ALTER TABLE `application` DROP FOREIGN KEY `FK_b4ae3fea4a24b4be1a86dacf8a2`'
    );
    await queryRunner.query(
      'ALTER TABLE `community` DROP FOREIGN KEY `FK_8e8283bdacc9e770918fe689333`'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_2b8381df8c3a1680f50e4bc2351`'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_9912e4cfc1e09848a392a651514`'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` DROP FOREIGN KEY `FK_037ba4b170844c039e74aa22ecd`'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` DROP FOREIGN KEY `FK_7671a7e33f6665764f4534a5967`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` DROP FOREIGN KEY `FK_3a69b0a6c67ead7617634009903`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` DROP FOREIGN KEY `FK_6db8627abbf00b1b986e359054f`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` DROP FOREIGN KEY `FK_b0c3f360534db92017e36a00bb2`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` DROP FOREIGN KEY `FK_ec1a68698d32f610a5fc1880c7f`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` DROP FOREIGN KEY `FK_f5ad15bcb06a95c2a109fbcce2a`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_1deebaabfc620e881858333b0d0`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_3c535130cde781b69259eec7d85`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_494b27cb13b59128fb24b365ca6`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_6b1bcaf365212806d8cc1f87b54`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_7d2b222d54b900071b0959f03ef`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_aa9668dd2340c2d794b414577b6`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_b025a2720e5ee0e5b38774f7a8c`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_0e2c355dbb2950851dbc17a4490`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_1c7744df92f39ab567084fd8c09`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_6860f1e3ae5509245bdb5c401f3`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_7d23d17ce61f11c92ff1ea0ed1a`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_9c169eb500e2d3823154c7b603d`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_c814aa7dc8a68f27d96d5d1782c`'
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP FOREIGN KEY `FK_35e34564793a27bb3c209a15245`'
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP FOREIGN KEY `FK_d07535c59062f86e887de8f0a57`'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` DROP FOREIGN KEY `FK_37bfa2f3da493204ddc6e773e5a`'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` DROP FOREIGN KEY `FK_6c57bb50b3b6fb4943c807c83ce`'
    );
    await queryRunner.query(
      'ALTER TABLE `context` DROP FOREIGN KEY `FK_9dd986ff532f7e2447ffe4934d2`'
    );
    await queryRunner.query(
      'ALTER TABLE `context` DROP FOREIGN KEY `FK_a03169c3f86480ba3863924f4d7`'
    );
    await queryRunner.query(
      'ALTER TABLE `user` DROP FOREIGN KEY `FK_9466682df91534dd95e4dbaa616`'
    );
    await queryRunner.query(
      'ALTER TABLE `user` DROP FOREIGN KEY `FK_b61c694cacfab25533bd23d9add`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_9dd986ff532f7e2447ffe4934d` ON `context`'
    );
    await queryRunner.query(
      'ALTER TABLE `credential` ADD CONSTRAINT `FK_dbe0929355f82e5995f0b7fd5e2` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` ADD CONSTRAINT `FK_0f9d41ee193d631a5439bb4f404` FOREIGN KEY (`actorGroupId`) REFERENCES `actor_group`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` ADD CONSTRAINT `FK_cbb1d7afa052a184471723d3297` FOREIGN KEY (`ecosystemModelId`) REFERENCES `ecosystem_model`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` ADD CONSTRAINT `FK_81fc213b2d9ad0cddeab1a9ce64` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` ADD CONSTRAINT `FK_8785b5a8510cabcc25d0f196783` FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` ADD CONSTRAINT `FK_22348b89c2f802a3d75d52fbd57` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` ADD CONSTRAINT `FK_d6d967126caae9df4c763985f9b` FOREIGN KEY (`opportunityId`) REFERENCES `opportunity`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD CONSTRAINT `FK_7ec2857c7d8d16432ffca1cb3d9` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD CONSTRAINT `FK_b4ae3fea4a24b4be1a86dacf8a2` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `community` ADD CONSTRAINT `FK_8e8283bdacc9e770918fe689333` FOREIGN KEY (`parentCommunityId`) REFERENCES `community`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_9912e4cfc1e09848a392a651514` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_2b8381df8c3a1680f50e4bc2351` FOREIGN KEY (`organisationId`) REFERENCES `organisation`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` ADD CONSTRAINT `FK_037ba4b170844c039e74aa22ecd` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` ADD CONSTRAINT `FK_7671a7e33f6665764f4534a5967` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
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
      'ALTER TABLE `project` ADD CONSTRAINT `FK_d07535c59062f86e887de8f0a57` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_35e34564793a27bb3c209a15245` FOREIGN KEY (`opportunityId`) REFERENCES `opportunity`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` ADD CONSTRAINT `FK_6c57bb50b3b6fb4943c807c83ce` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` ADD CONSTRAINT `FK_37bfa2f3da493204ddc6e773e5a` FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `context` ADD CONSTRAINT `FK_a03169c3f86480ba3863924f4d7` FOREIGN KEY (`ecosystemModelId`) REFERENCES `ecosystem_model`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `context` ADD CONSTRAINT `FK_9dd986ff532f7e2447ffe4934d2` FOREIGN KEY (`visualId`) REFERENCES `visual`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD CONSTRAINT `FK_9466682df91534dd95e4dbaa616` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD CONSTRAINT `FK_b61c694cacfab25533bd23d9add` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `user` DROP FOREIGN KEY `FK_b61c694cacfab25533bd23d9add`'
    );
    await queryRunner.query(
      'ALTER TABLE `user` DROP FOREIGN KEY `FK_9466682df91534dd95e4dbaa616`'
    );
    await queryRunner.query(
      'ALTER TABLE `context` DROP FOREIGN KEY `FK_9dd986ff532f7e2447ffe4934d2`'
    );
    await queryRunner.query(
      'ALTER TABLE `context` DROP FOREIGN KEY `FK_a03169c3f86480ba3863924f4d7`'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` DROP FOREIGN KEY `FK_37bfa2f3da493204ddc6e773e5a`'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` DROP FOREIGN KEY `FK_6c57bb50b3b6fb4943c807c83ce`'
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP FOREIGN KEY `FK_35e34564793a27bb3c209a15245`'
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP FOREIGN KEY `FK_d07535c59062f86e887de8f0a57`'
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
      'ALTER TABLE `organisation` DROP FOREIGN KEY `FK_7671a7e33f6665764f4534a5967`'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` DROP FOREIGN KEY `FK_037ba4b170844c039e74aa22ecd`'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_2b8381df8c3a1680f50e4bc2351`'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_9912e4cfc1e09848a392a651514`'
    );
    await queryRunner.query(
      'ALTER TABLE `community` DROP FOREIGN KEY `FK_8e8283bdacc9e770918fe689333`'
    );
    await queryRunner.query(
      'ALTER TABLE `application` DROP FOREIGN KEY `FK_b4ae3fea4a24b4be1a86dacf8a2`'
    );
    await queryRunner.query(
      'ALTER TABLE `application` DROP FOREIGN KEY `FK_7ec2857c7d8d16432ffca1cb3d9`'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` DROP FOREIGN KEY `FK_d6d967126caae9df4c763985f9b`'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` DROP FOREIGN KEY `FK_22348b89c2f802a3d75d52fbd57`'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` DROP FOREIGN KEY `FK_8785b5a8510cabcc25d0f196783`'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` DROP FOREIGN KEY `FK_81fc213b2d9ad0cddeab1a9ce64`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` DROP FOREIGN KEY `FK_cbb1d7afa052a184471723d3297`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` DROP FOREIGN KEY `FK_0f9d41ee193d631a5439bb4f404`'
    );
    await queryRunner.query(
      'ALTER TABLE `credential` DROP FOREIGN KEY `FK_dbe0929355f82e5995f0b7fd5e2`'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_9dd986ff532f7e2447ffe4934d` ON `context` (`visualId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD CONSTRAINT `FK_b61c694cacfab25533bd23d9add` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD CONSTRAINT `FK_9466682df91534dd95e4dbaa616` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `context` ADD CONSTRAINT `FK_a03169c3f86480ba3863924f4d7` FOREIGN KEY (`ecosystemModelId`) REFERENCES `ecosystem_model`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `context` ADD CONSTRAINT `FK_9dd986ff532f7e2447ffe4934d2` FOREIGN KEY (`visualId`) REFERENCES `visual`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` ADD CONSTRAINT `FK_6c57bb50b3b6fb4943c807c83ce` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` ADD CONSTRAINT `FK_37bfa2f3da493204ddc6e773e5a` FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_d07535c59062f86e887de8f0a57` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_35e34564793a27bb3c209a15245` FOREIGN KEY (`opportunityId`) REFERENCES `opportunity`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_c814aa7dc8a68f27d96d5d1782c` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_9c169eb500e2d3823154c7b603d` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_7d23d17ce61f11c92ff1ea0ed1a` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_6860f1e3ae5509245bdb5c401f3` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_1c7744df92f39ab567084fd8c09` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_0e2c355dbb2950851dbc17a4490` FOREIGN KEY (`challengeId`) REFERENCES `challenge`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_b025a2720e5ee0e5b38774f7a8c` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_aa9668dd2340c2d794b414577b6` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_7d2b222d54b900071b0959f03ef` FOREIGN KEY (`parentChallengeId`) REFERENCES `challenge`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_6b1bcaf365212806d8cc1f87b54` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_494b27cb13b59128fb24b365ca6` FOREIGN KEY (`parentEcoverseId`) REFERENCES `ecoverse`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_3c535130cde781b69259eec7d85` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_1deebaabfc620e881858333b0d0` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD CONSTRAINT `FK_f5ad15bcb06a95c2a109fbcce2a` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD CONSTRAINT `FK_ec1a68698d32f610a5fc1880c7f` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD CONSTRAINT `FK_b0c3f360534db92017e36a00bb2` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD CONSTRAINT `FK_6db8627abbf00b1b986e359054f` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD CONSTRAINT `FK_3a69b0a6c67ead7617634009903` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` ADD CONSTRAINT `FK_7671a7e33f6665764f4534a5967` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` ADD CONSTRAINT `FK_037ba4b170844c039e74aa22ecd` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_9912e4cfc1e09848a392a651514` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_2b8381df8c3a1680f50e4bc2351` FOREIGN KEY (`organisationId`) REFERENCES `organisation`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `community` ADD CONSTRAINT `FK_8e8283bdacc9e770918fe689333` FOREIGN KEY (`parentCommunityId`) REFERENCES `community`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD CONSTRAINT `FK_b4ae3fea4a24b4be1a86dacf8a2` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD CONSTRAINT `FK_7ec2857c7d8d16432ffca1cb3d9` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` ADD CONSTRAINT `FK_d6d967126caae9df4c763985f9b` FOREIGN KEY (`opportunityId`) REFERENCES `opportunity`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` ADD CONSTRAINT `FK_8785b5a8510cabcc25d0f196783` FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` ADD CONSTRAINT `FK_22348b89c2f802a3d75d52fbd57` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` ADD CONSTRAINT `FK_81fc213b2d9ad0cddeab1a9ce64` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` ADD CONSTRAINT `FK_cbb1d7afa052a184471723d3297` FOREIGN KEY (`ecosystemModelId`) REFERENCES `ecosystem_model`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` ADD CONSTRAINT `FK_0f9d41ee193d631a5439bb4f404` FOREIGN KEY (`actorGroupId`) REFERENCES `actor_group`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `credential` ADD CONSTRAINT `FK_dbe0929355f82e5995f0b7fd5e2` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
  }
}

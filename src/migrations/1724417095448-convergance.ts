import { MigrationInterface, QueryRunner } from 'typeorm';

export class Convergance1724417095448 implements MigrationInterface {
  name = 'Convergance1724417095448';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // was missing
    await queryRunner.query('ALTER TABLE `licensing` DROP COLUMN `basePlanId`');
    await queryRunner.query(
      'ALTER TABLE `tagset_template` CHANGE `name` `name` varchar(128) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset_template` CHANGE `type` `type` varchar(128) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset_template` CHANGE `allowedValues` `allowedValues` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` CHANGE `type` `type` varchar(128) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `visual` CHANGE `uri` `uri` varchar(2048) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `visual` CHANGE `aspectRatio` `aspectRatio` decimal(2,1) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `location` CHANGE `city` `city` varchar(128) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `location` CHANGE `country` `country` varchar(128) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `location` CHANGE `addressLine1` `addressLine1` varchar(512) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `location` CHANGE `addressLine2` `addressLine2` varchar(512) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `location` CHANGE `stateOrProvince` `stateOrProvince` varchar(128) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `location` CHANGE `postalCode` `postalCode` varchar(128) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `document` CHANGE `displayName` `displayName` varchar(512) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `document` CHANGE `mimeType` `mimeType` varchar(128) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `document` CHANGE `size` `size` int NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `document` CHANGE `externalID` `externalID` varchar(128) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `storage_bucket` CHANGE `allowedMimeTypes` `allowedMimeTypes` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `storage_bucket` CHANGE `maxFileSize` `maxFileSize` int NOT NULL'
    );
    await queryRunner.query('ALTER TABLE `profile` CHANGE `tagline` `tagline` text NULL');
    await queryRunner.query(
      'ALTER TABLE `profile` CHANGE `type` `type` varchar(128) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `vc_interaction` CHANGE `threadID` `threadID` varchar(44) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `room` CHANGE `type` `type` varchar(128) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `whiteboard` CHANGE `contentUpdatePolicy` `contentUpdatePolicy` varchar(128) NOT NULL'
    );
    await queryRunner.query('ALTER TABLE \`whiteboard\` CHANGE `nameID` `nameID` varchar(36) NOT NULL');
    await queryRunner.query(
      'ALTER TABLE `whiteboard` ADD UNIQUE INDEX `IDX_d3b86160bb7d704212382b0ca4` (`authorizationId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `whiteboard` ADD UNIQUE INDEX `IDX_3f9e9e2798d2a4d84b16ee8477` (`profileId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `callout_contribution_policy` CHANGE `state` `state` varchar(128) NOT NULL'
    );
    // was 255 before
    await queryRunner.query(
      'ALTER TABLE `post` CHANGE `nameID` `nameID` varchar(36) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `post` CHANGE `type` `type` varchar(128) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `post` CHANGE `createdBy` `createdBy` char(36) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `callout_contribution` CHANGE `createdBy` `createdBy` char(36) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `callout` CHANGE `nameID` `nameID` varchar(36) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `callout` CHANGE `visibility` `visibility` varchar(128) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `callout` CHANGE `publishedDate` `publishedDate` datetime NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `calendar_event` CHANGE `nameID` `nameID` varchar(36) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `calendar_event` CHANGE `type` `type` varchar(128) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `calendar_event` CHANGE `createdBy` `createdBy` char(36) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `calendar_event` CHANGE `startDate` `startDate` datetime NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `calendar_event` CHANGE `wholeDay` `wholeDay` tinyint NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `calendar_event` CHANGE `multipleDays` `multipleDays` tinyint NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `calendar_event` CHANGE `durationMinutes` `durationMinutes` int NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_flow` CHANGE `states` `states` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `collaboration` CHANGE `groupsStr` `groupsStr` text NOT NULL'
    );
    // was missing
    await queryRunner.query(
      'ALTER TABLE `collaboration` ADD UNIQUE INDEX `IDX_35c6b1de6d4d89dfe8e9c85d77` (`innovationFlowId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `organization_verification` CHANGE `organizationID` `organizationID` varchar(36) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `organization_verification` CHANGE `status` `status` varchar(128) NOT NULL DEFAULT \'not-verified\''
    );
    await queryRunner.query(
      'ALTER TABLE `credential` CHANGE `resourceID` `resourceID` varchar(36) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `credential` CHANGE `type` `type` varchar(128) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `agent` CHANGE `type` `type` varchar(128) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `organization` CHANGE `nameID` `nameID` varchar(36) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `organization` CHANGE `accountID` `accountID` char(36) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `nvp` CHANGE `value` `value` varchar(255) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `user` CHANGE `accountID` `accountID` char(36) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `user` CHANGE `accountUpn` `accountUpn` varchar(128) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `user` CHANGE `firstName` `firstName` varchar(128) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `user` CHANGE `lastName` `lastName` varchar(128) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `user` CHANGE `email` `email` varchar(512) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `user` CHANGE `phone` `phone` varchar(128) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `communication` CHANGE `spaceID` `spaceID` varchar(36) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `community_policy` CHANGE `member` `member` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `community_policy` CHANGE `lead` `lead` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `community_policy` CHANGE `admin` `admin` text NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `form` CHANGE `questions` `questions` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `form` CHANGE `description` `description` text NOT NULL'
    );
    // todo: will this work varchar on ID
    await queryRunner.query(
      'ALTER TABLE `invitation` DROP FOREIGN KEY `FK_b132226941570cb650a4023d493`'
    ); // authorizationId
    await queryRunner.query(
      'ALTER TABLE `invitation` DROP FOREIGN KEY `FK_b0c80ccf319a1c7a7af12b39987`'
    ); // authorizationId
    await queryRunner.query('ALTER TABLE `invitation` DROP PRIMARY KEY');
    await queryRunner.query(
      'ALTER TABLE `invitation` CHANGE `id` `id` char(36) NOT NULL PRIMARY KEY'
    );

    await queryRunner.query(
      'ALTER TABLE `invitation` CHANGE `invitedContributor` `invitedContributor` char(36) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `invitation` CHANGE `createdBy` `createdBy` char(36) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `invitation` CHANGE `contributorType` `contributorType` varchar(128) NOT NULL'
    );
    // todo: will this work varchar on ID
    await queryRunner.query(
      'DROP INDEX `REL_b132226941570cb650a4023d49` ON `invitation`'
    ); // authorizationId
    await queryRunner.query(
      'DROP INDEX `IDX_b132226941570cb650a4023d49` ON `invitation`'
    ); // authorizationId
    await queryRunner.query(
      'ALTER TABLE `invitation` CHANGE `authorizationId` `authorizationId` char(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `invitation` ADD UNIQUE INDEX `IDX_b132226941570cb650a4023d49` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_b132226941570cb650a4023d49` ON `invitation` (`authorizationId`)'
    );

    await queryRunner.query(
      'DROP INDEX `REL_b0c80ccf319a1c7a7af12b3998` ON `invitation`'
    ); //lifecycleId
    await queryRunner.query(
      'ALTER TABLE `invitation` DROP INDEX `IDX_b0c80ccf319a1c7a7af12b3998`'
    ); //lifecycleId
    await queryRunner.query(
      'ALTER TABLE `invitation` CHANGE `lifecycleId` `lifecycleId` char(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `invitation` ADD UNIQUE INDEX `IDX_b0c80ccf319a1c7a7af12b3998` (`lifecycleId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_b0c80ccf319a1c7a7af12b3998` ON `invitation` (`lifecycleId`)'
    );

    await queryRunner.query(
      'ALTER TABLE `invitation` DROP FOREIGN KEY `FK_339c1fe2a9c5caef5b982303fb0`'
    ); // invitation.communityId
    await queryRunner.query(
      'ALTER TABLE `invitation` CHANGE `communityId` `communityId` char(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `invitation` ADD CONSTRAINT `FK_339c1fe2a9c5caef5b982303fb0` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );

    await queryRunner.query(
      'ALTER TABLE `library` ADD UNIQUE INDEX `IDX_3879db652f2421337691219ace` (`authorizationId`)'
    );

    await queryRunner.query(
      'ALTER TABLE `license_plan` CHANGE `sortOrder` `sortOrder` int NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `license_plan` CHANGE `licenseCredential` `licenseCredential` text NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `license_plan` CHANGE `type` `type` varchar(128) NOT NULL'
    );
    // missing
    await queryRunner.query(
      'ALTER TABLE `licensing` ADD UNIQUE INDEX `IDX_0c6a4d0a6c13a3f5df6ac01509` (`authorizationId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `licensing` ADD UNIQUE INDEX `IDX_a5dae5a376dd49c7c076893d40` (`licensePolicyId`)'
    );

    await queryRunner.query(
      'ALTER TABLE `discussion` CHANGE `nameID` `nameID` varchar(36) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `discussion` CHANGE `createdBy` `createdBy` char(36) NOT NULL'
    );
    // missing
    await queryRunner.query(
      'ALTER TABLE `platform` ADD UNIQUE INDEX `IDX_9f621c51dd854634d8766a9cfa` (`authorizationId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `platform` ADD UNIQUE INDEX `IDX_425bbb4b951f7f4629710763fc` (`licensingId`)'
    );

    await queryRunner.query(
      'ALTER TABLE `platform_invitation` CHANGE `platformRole` `platformRole` varchar(128) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `platform_invitation` CHANGE `email` `email` varchar(128) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `platform_invitation` CHANGE `firstName` `firstName` varchar(128) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `platform_invitation` CHANGE `lastName` `lastName` varchar(128) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `platform_invitation` CHANGE `createdBy` `createdBy` char(36) NOT NULL'
    );
    // missing
    await queryRunner.query(
      'ALTER TABLE `platform_invitation` ADD UNIQUE INDEX `IDX_c0448d2c992a62c9c11bd0f142` (`authorizationId`)'
    );

    await queryRunner.query(
      'ALTER TABLE `innovation_flow_template` CHANGE `states` `states` text NOT NULL'
    );
    // missing
    await queryRunner.query(
      'ALTER TABLE `space_defaults` ADD UNIQUE INDEX `IDX_592a23e68922853bae6ebecd85` (`innovationFlowTemplateId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `space` CHANGE `nameID` `nameID` varchar(36) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `space` CHANGE `type` `type` varchar(128) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `space` CHANGE `levelZeroSpaceID` `levelZeroSpaceID` varchar(36) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `space` CHANGE `visibility` `visibility` varchar(128) NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `ai_persona` CHANGE `dataAccessMode` `dataAccessMode` varchar(128) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `ai_persona` CHANGE `interactionModes` `interactionModes` text NOT NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `virtual_contributor` CHANGE `nameID` `nameID` varchar(36) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `virtual_contributor` CHANGE `searchVisibility` `searchVisibility` varchar(128) NOT NULL'
    );
    // missing
    await queryRunner.query(
      'ALTER TABLE `innovation_pack` ADD UNIQUE INDEX `IDX_8af8122897b05315e7eb892525` (`authorizationId`)'
    );
    // missing
    await queryRunner.query(
      'ALTER TABLE `account` ADD UNIQUE INDEX `IDX_950221e932175dc7cf7c006488` (`storageAggregatorId`)'
    );

    await queryRunner.query(
      'DROP INDEX `IDX_1d39dac2c6d2f17286d90c306b` ON `innovation_hub`'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_hub` CHANGE `nameID` `nameID` varchar(36) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_hub` ADD UNIQUE INDEX `IDX_1d39dac2c6d2f17286d90c306b` (`nameID`)'
    );

    await queryRunner.query(
      'DROP INDEX `IDX_8f35d04d098bb6c7c57a9a83ac` ON `innovation_hub`'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_hub` CHANGE `subdomain` `subdomain` varchar(63) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_hub` ADD UNIQUE INDEX `IDX_8f35d04d098bb6c7c57a9a83ac` (`subdomain`)'
    );

    await queryRunner.query(
      'ALTER TABLE `innovation_hub` CHANGE `listedInStore` `listedInStore` tinyint NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_hub` CHANGE `searchVisibility` `searchVisibility` varchar(128) NOT NULL DEFAULT \'account\''
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_hub` DROP FOREIGN KEY `FK_156fd30246eb151b9d17716abf5`'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_hub` CHANGE `accountId` `accountId` char(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_hub` ADD CONSTRAINT `FK_156fd30246eb151b9d17716abf5` FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    // missing
    await queryRunner.query(
      'ALTER TABLE `activity` ADD UNIQUE INDEX `IDX_07a39cea9426b689be25fd61de` (`rowId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `activity` CHANGE `triggeredBy` `triggeredBy` char(36) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `activity` CHANGE `resourceID` `resourceID` char(36) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `activity` CHANGE `collaborationID` `collaborationID` char(36) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `activity` CHANGE `visibility` `visibility` tinyint NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `activity` CHANGE `description` `description` varchar(512) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `activity` CHANGE `type` `type` varchar(128) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `ai_persona_service` CHANGE `dataAccessMode` `dataAccessMode` varchar(128) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `ai_persona_service` CHANGE `bodyOfKnowledgeType` `bodyOfKnowledgeType` varchar(128) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `ai_persona_service` CHANGE `bodyOfKnowledgeID` `bodyOfKnowledgeID` varchar(128) NOT NULL'
    );
    //
    //
    //
    //
    //
    // probably some are not needed
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_d9e2dfcccf59233c17cc6bc641` ON `document` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_9fb9257b14ec21daf5bc9aa4c8` ON `document` (`tagsetId`)'
    );
    // await queryRunner.query(`CREATE UNIQUE INDEX \`REL_f2f48b57269987b13b415a0058\` ON \`storage_bucket\` (\`authorizationId\`)`);
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_432056041df0e4337b17ff7b09` ON `profile` (`locationId`)'
    );
    // there are two unique indexes; the last one needs to go
    await queryRunner.query(
      'ALTER TABLE `profile` DROP INDEX `IDX_432056041df0e4337b17ff7b09`'
    ); // profile.locationId
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_d1d94dd8e0c417b4188a05ccbc` ON `room` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_d3b86160bb7d704212382b0ca4` ON `whiteboard` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_3f9e9e2798d2a4d84b16ee8477` ON `whiteboard` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_390343b22abec869bf80041933` ON `post` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_970844fcd10c2b6df7c1b49eac` ON `post` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_042b9825d770d6b3009ae206c2` ON `post` (`commentsId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_cf776244b01436d8ca5cc76284` ON `callout` (`framingId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_1e740008a7e1512966e3b08414` ON `callout` (`contributionPolicyId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_36b0da55acff774d0845aeb55f` ON `callout` (`contributionDefaultsId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_62ed316cda7b75735b20307b47` ON `callout` (`commentsId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_8ee86afa2808a4ab523b9ee6c5` ON `calendar_event` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_9349e137959f3ca5818c2e62b3` ON `calendar_event` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_b5069b11030e9608ee4468f850` ON `calendar_event` (`commentsId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_6e74d59afda096b68d12a69969` ON `calendar` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_5fe58ece01b48496aebc04733d` ON `timeline` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_56aae15a664b2889a1a11c2cf8` ON `timeline` (`calendarId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_a6e050daa4c7a3ab1e411c3651` ON `innovation_flow` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_96a8cbe1706f459fd7d883be9b` ON `innovation_flow` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_b7ece56376ac7ca0b9a56c33b3` ON `collaboration` (`tagsetTemplateSetId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_f67a2d25c945269d602c182fbc` ON `collaboration` (`timelineId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_35c6b1de6d4d89dfe8e9c85d77` ON `collaboration` (`innovationFlowId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_c66eddab0caacb1ef8d46bcafd` ON `organization_verification` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_1cc3b275fc2a9d9d9b0ae33b31` ON `organization_verification` (`lifecycleId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_b4cf0f96bf08cf396f68355522` ON `preference` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_8e76dcf171c45875c44febb1d8` ON `preference_set` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_e0e150e4f11d906b931b46a2d8` ON `organization` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_d2cb77c14644156ec8e865608e` ON `organization` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_7f1bec8979b57ed7ebd392a2ca` ON `organization` (`agentId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_5a72d5b37312bac2e0a0115718` ON `organization` (`verificationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_58fd47c4a6ac8df9fe2bcaed87` ON `organization` (`preferenceSetId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_395aa74996a1f978b4969d114b` ON `organization` (`storageAggregatorId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_028322b763dc94242dc9f638f9` ON `user` (`preferenceSetId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_10458c50c10436b6d589b40e5c` ON `user` (`storageAggregatorId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_eb99e588873c788a68a035478a` ON `communication` (`updatesId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_3879db652f2421337691219ace` ON `library` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_0c6a4d0a6c13a3f5df6ac01509` ON `licensing` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_a5dae5a376dd49c7c076893d40` ON `licensing` (`licensePolicyId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_2d8a3ca181c3f0346817685d21` ON `discussion` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_5337074c9b818bb63e6f314c80` ON `discussion` (`commentsId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_9f621c51dd854634d8766a9cfa` ON `platform` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_425bbb4b951f7f4629710763fc` ON `platform` (`licensingId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_c0448d2c992a62c9c11bd0f142` ON `platform_invitation` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_7fbe50fa78a37776ad962cb764` ON `community` (`communicationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_c7d74dd6b92d4202c705cd3676` ON `community` (`applicationFormId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_3823de95920943655430125fa9` ON `community` (`policyId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_c3bdb693adb031b6613edcef4f` ON `post_template` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_4a9c8cefc6c7e33aa728d22a90` ON `post_template` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_cc2faf30ce52648db9299d7072` ON `whiteboard_template` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_5b4948db27c348e65055187d5e` ON `whiteboard_template` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_3aec561629db1d65a9b2b3a788` ON `innovation_flow_template` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_bd591d7403dabe091f6a116975` ON `innovation_flow_template` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_479f799f0d86e43c9d8623e827` ON `callout_template` (`contributionDefaultsId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_29ff764dc6de1a9dc289cbfb01` ON `callout_template` (`contributionPolicyId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_eb0176ef4b98c143322aa6f809` ON `templates_set` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_592a23e68922853bae6ebecd85` ON `space_defaults` (`innovationFlowTemplateId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_8d03fd2c8e8411ec9192c79cd9` ON `space` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_b4250035291aac1329d59224a9` ON `space` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_ea06eb8894469a0f262d929bf0` ON `space` (`collaborationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_cc0b08eb9679d3daa95153c2af` ON `space` (`contextId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_68fa2c2b00cc1ed77e7c225e8b` ON `space` (`communityId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_9c664d684f987a735678b0ba82` ON `space` (`agentId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_980c4643d7d9de1b97bc39f518` ON `space` (`storageAggregatorId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_43559aeadc1a5169d17e81b3d4` ON `space` (`libraryId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_6b1efee39d076d9f7ecb8fef4c` ON `space` (`defaultsId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_8af8122897b05315e7eb892525` ON `innovation_pack` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_950221e932175dc7cf7c006488` ON `account` (`storageAggregatorId`)'
    );
    await queryRunner.query(`CREATE UNIQUE INDEX \`REL_4fbd109f9bb84f58b7a3c60649\` ON \`visual\` (\`authorizationId\`)`);
    await queryRunner.query(`CREATE UNIQUE INDEX \`REL_f2f48b57269987b13b415a0058\` ON \`storage_bucket\` (\`authorizationId\`)`);
    await queryRunner.query(
      'ALTER TABLE `tagset_template` ADD CONSTRAINT `FK_96f23f044acf305c1699e0319d2` FOREIGN KEY (`tagsetTemplateSetId`) REFERENCES `tagset_template_set`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` ADD CONSTRAINT `FK_644155610ddc40dc4e19781c8f0` FOREIGN KEY (`tagsetTemplateId`) REFERENCES `tagset_template`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `visual` ADD CONSTRAINT `FK_4fbd109f9bb84f58b7a3c60649c` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `visual` ADD CONSTRAINT `FK_1104f3ef8497ca40d99b9f46b87` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `document` ADD CONSTRAINT `FK_d9e2dfcccf59233c17cc6bc6418` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `document` ADD CONSTRAINT `FK_851e50ec4be7c62a1f9b9a430bf` FOREIGN KEY (`storageBucketId`) REFERENCES `storage_bucket`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `document` ADD CONSTRAINT `FK_9fb9257b14ec21daf5bc9aa4c8e` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `storage_bucket` ADD CONSTRAINT `FK_f2f48b57269987b13b415a00587` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `profile` ADD CONSTRAINT `FK_432056041df0e4337b17ff7b09d` FOREIGN KEY (`locationId`) REFERENCES `location`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `vc_interaction` ADD CONSTRAINT `FK_d6f78c95ff41cdd30e505a4ebbb` FOREIGN KEY (`roomId`) REFERENCES `room`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `room` ADD CONSTRAINT `FK_d1d94dd8e0c417b4188a05ccbca` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `whiteboard` ADD CONSTRAINT `FK_d3b86160bb7d704212382b0ca44` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `whiteboard` ADD CONSTRAINT `FK_3f9e9e2798d2a4d84b16ee8477c` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `post` ADD CONSTRAINT `FK_390343b22abec869bf800419333` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `post` ADD CONSTRAINT `FK_970844fcd10c2b6df7c1b49eacf` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `post` ADD CONSTRAINT `FK_042b9825d770d6b3009ae206c2f` FOREIGN KEY (`commentsId`) REFERENCES `room`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    /////
    /////
    // these are very questionable - only the update and cascade are changed;
    await queryRunner.query(`ALTER TABLE \`application_questions\` DROP FOREIGN KEY \`FK_8495fae86f13836b0745642baa8\``);
    await queryRunner.query(`ALTER TABLE \`application_questions\` ADD CONSTRAINT \`FK_8495fae86f13836b0745642baa8\` FOREIGN KEY (\`applicationId\`) REFERENCES \`application\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
    // these are very questionable - only the update and cascade are changed;
    await queryRunner.query(`ALTER TABLE \`application_questions\` DROP FOREIGN KEY \`FK_fe50118fd82e7fe2f74f986a195\``);
    await queryRunner.query(`ALTER TABLE \`application_questions\` ADD CONSTRAINT \`FK_fe50118fd82e7fe2f74f986a195\` FOREIGN KEY (\`nvpId\`) REFERENCES \`nvp\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
    ///// some constraints and keys are probably not needed
    await queryRunner.query(`ALTER TABLE \`community_guidelines\` ADD CONSTRAINT \`FK_3d60fe4fa40d54bad7d51bb4bd1\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`community_guidelines\` ADD CONSTRAINT \`FK_3d60fe4fa40d54bad7d51bb4bd1\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(
      'ALTER TABLE `calendar_event` ADD CONSTRAINT `FK_8ee86afa2808a4ab523b9ee6c5e` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `calendar_event` ADD CONSTRAINT `FK_9349e137959f3ca5818c2e62b3f` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `calendar_event` ADD CONSTRAINT `FK_b5069b11030e9608ee4468f850d` FOREIGN KEY (`commentsId`) REFERENCES `room`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `calendar_event` ADD CONSTRAINT `FK_80ab7835e1749581a27462eb87f` FOREIGN KEY (`calendarId`) REFERENCES `calendar`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `calendar` ADD CONSTRAINT `FK_6e74d59afda096b68d12a699691` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `timeline` ADD CONSTRAINT `FK_5fe58ece01b48496aebc04733da` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `timeline` ADD CONSTRAINT `FK_56aae15a664b2889a1a11c2cf82` FOREIGN KEY (`calendarId`) REFERENCES `calendar`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_flow` ADD CONSTRAINT `FK_a6e050daa4c7a3ab1e411c36517` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_flow` ADD CONSTRAINT `FK_96a8cbe1706f459fd7d883be9bd` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `collaboration` ADD CONSTRAINT `FK_b7ece56376ac7ca0b9a56c33b3a` FOREIGN KEY (`tagsetTemplateSetId`) REFERENCES `tagset_template_set`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `collaboration` ADD CONSTRAINT `FK_f67a2d25c945269d602c182fbc0` FOREIGN KEY (`timelineId`) REFERENCES `timeline`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `collaboration` ADD CONSTRAINT `FK_35c6b1de6d4d89dfe8e9c85d771` FOREIGN KEY (`innovationFlowId`) REFERENCES `innovation_flow`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organization_verification` ADD CONSTRAINT `FK_c66eddab0caacb1ef8d46bcafdb` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organization_verification` ADD CONSTRAINT `FK_1cc3b275fc2a9d9d9b0ae33b310` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `preference` ADD CONSTRAINT `FK_b4cf0f96bf08cf396f683555229` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `preference` ADD CONSTRAINT `FK_46d60bf133073f749b8f07e534c` FOREIGN KEY (`preferenceDefinitionId`) REFERENCES `preference_definition`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `preference` ADD CONSTRAINT `FK_f4b5742f589e2ac8bfe48b708c0` FOREIGN KEY (`preferenceSetId`) REFERENCES `preference_set`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `preference_set` ADD CONSTRAINT `FK_8e76dcf171c45875c44febb1d8d` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organization` ADD CONSTRAINT `FK_e0e150e4f11d906b931b46a2d89` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organization` ADD CONSTRAINT `FK_d2cb77c14644156ec8e865608e0` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organization` ADD CONSTRAINT `FK_7f1bec8979b57ed7ebd392a2ca9` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organization` ADD CONSTRAINT `FK_5a72d5b37312bac2e0a01157185` FOREIGN KEY (`verificationId`) REFERENCES `organization_verification`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organization` ADD CONSTRAINT `FK_58fd47c4a6ac8df9fe2bcaed874` FOREIGN KEY (`preferenceSetId`) REFERENCES `preference_set`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organization` ADD CONSTRAINT `FK_395aa74996a1f978b4969d114b1` FOREIGN KEY (`storageAggregatorId`) REFERENCES `storage_aggregator`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_694ebec955a90e999d9926b7da8` FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD CONSTRAINT `FK_028322b763dc94242dc9f638f9b` FOREIGN KEY (`preferenceSetId`) REFERENCES `preference_set`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD CONSTRAINT `FK_10458c50c10436b6d589b40e5ca` FOREIGN KEY (`storageAggregatorId`) REFERENCES `storage_aggregator`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `communication` ADD CONSTRAINT `FK_eb99e588873c788a68a035478ab` FOREIGN KEY (`updatesId`) REFERENCES `room`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `invitation` ADD CONSTRAINT `FK_b132226941570cb650a4023d493` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `invitation` ADD CONSTRAINT `FK_b0c80ccf319a1c7a7af12b39987` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `library` ADD CONSTRAINT `FK_3879db652f2421337691219ace8` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `license_plan` ADD CONSTRAINT `FK_3030904030f5d30f483b49905d1` FOREIGN KEY (`licensingId`) REFERENCES `licensing`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `licensing` ADD CONSTRAINT `FK_0c6a4d0a6c13a3f5df6ac015096` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `licensing` ADD CONSTRAINT `FK_a5dae5a376dd49c7c076893d40b` FOREIGN KEY (`licensePolicyId`) REFERENCES `license_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `discussion` ADD CONSTRAINT `FK_5337074c9b818bb63e6f314c808` FOREIGN KEY (`commentsId`) REFERENCES `room`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `platform` ADD CONSTRAINT `FK_9f621c51dd854634d8766a9cfaf` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `platform` ADD CONSTRAINT `FK_f516dd9a46616999c7e9a6adc15` FOREIGN KEY (`storageAggregatorId`) REFERENCES `storage_aggregator`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `platform` ADD CONSTRAINT `FK_425bbb4b951f7f4629710763fc0` FOREIGN KEY (`licensingId`) REFERENCES `licensing`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `platform_invitation` ADD CONSTRAINT `FK_c0448d2c992a62c9c11bd0f1422` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `platform_invitation` ADD CONSTRAINT `FK_b3d3f3c2ce851d1059c4ed26ba2` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `community` ADD CONSTRAINT `FK_c7d74dd6b92d4202c705cd36769` FOREIGN KEY (`applicationFormId`) REFERENCES `form`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `community` ADD CONSTRAINT `FK_3823de95920943655430125fa93` FOREIGN KEY (`policyId`) REFERENCES `community_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `post_template` ADD CONSTRAINT `FK_c3bdb693adb031b6613edcef4f4` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `post_template` ADD CONSTRAINT `FK_4a9c8cefc6c7e33aa728d22a905` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `post_template` ADD CONSTRAINT `FK_34b22da74bc9e821a99fbe78a19` FOREIGN KEY (`templatesSetId`) REFERENCES `templates_set`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `whiteboard_template` ADD CONSTRAINT `FK_cc2faf30ce52648db9299d7072b` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `whiteboard_template` ADD CONSTRAINT `FK_5b4948db27c348e65055187d5ea` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `whiteboard_template` ADD CONSTRAINT `FK_6776ee550271ece75b3b2a5ba18` FOREIGN KEY (`templatesSetId`) REFERENCES `templates_set`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_flow_template` ADD CONSTRAINT `FK_3aec561629db1d65a9b2b3a788f` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_flow_template` ADD CONSTRAINT `FK_bd591d7403dabe091f6a116975d` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_flow_template` ADD CONSTRAINT `FK_4b7450c0baad85f4afee2ce25e6` FOREIGN KEY (`templatesSetId`) REFERENCES `templates_set`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `callout_template` ADD CONSTRAINT `FK_479f799f0d86e43c9d8623e8277` FOREIGN KEY (`contributionDefaultsId`) REFERENCES `callout_contribution_defaults`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `callout_template` ADD CONSTRAINT `FK_29ff764dc6de1a9dc289cbfb01b` FOREIGN KEY (`contributionPolicyId`) REFERENCES `callout_contribution_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `templates_set` ADD CONSTRAINT `FK_eb0176ef4b98c143322aa6f8090` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `space_defaults` ADD CONSTRAINT `FK_592a23e68922853bae6ebecd85e` FOREIGN KEY (`innovationFlowTemplateId`) REFERENCES `innovation_flow_template`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_8d03fd2c8e8411ec9192c79cd99` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_b4250035291aac1329d59224a96` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_ef1ff4ac7f613cc0677e2295b30` FOREIGN KEY (`parentSpaceId`) REFERENCES `space`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_6bdeffaf6ea6159b4672a2aed70` FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_ea06eb8894469a0f262d929bf06` FOREIGN KEY (`collaborationId`) REFERENCES `collaboration`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_cc0b08eb9679d3daa95153c2af5` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_68fa2c2b00cc1ed77e7c225e8ba` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_9c664d684f987a735678b0ba825` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_980c4643d7d9de1b97bc39f5185` FOREIGN KEY (`storageAggregatorId`) REFERENCES `storage_aggregator`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_43559aeadc1a5169d17e81b3d45` FOREIGN KEY (`libraryId`) REFERENCES `templates_set`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_6b1efee39d076d9f7ecb8fef4cd` FOREIGN KEY (`defaultsId`) REFERENCES `space_defaults`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_pack` ADD CONSTRAINT `FK_8af8122897b05315e7eb8925253` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_pack` ADD CONSTRAINT `FK_5facd6d188068a5a1c5b6f07fc3` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_pack` ADD CONSTRAINT `FK_51014590f9644e6ff9e0536f40f` FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_pack` ADD CONSTRAINT `FK_a1441e46c8d36090e1f6477cea5` FOREIGN KEY (`templatesSetId`) REFERENCES `templates_set`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `account` ADD CONSTRAINT `FK_950221e932175dc7cf7c0064887` FOREIGN KEY (`storageAggregatorId`) REFERENCES `storage_aggregator`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

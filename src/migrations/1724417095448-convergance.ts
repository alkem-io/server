import { MigrationInterface, QueryRunner } from "typeorm";

export class Convergance1724417095448 implements MigrationInterface {
    name = 'Convergance1724417095448'

    public async up(queryRunner: QueryRunner): Promise<void> {
      // was missing
      await queryRunner.query('ALTER TABLE `licensing` DROP COLUMN `basePlanId`');
      await queryRunner.query('ALTER TABLE `tagset_template` CHANGE `name` varchar(128) NOT NULL');
      await queryRunner.query('ALTER TABLE `tagset_template` CHANGE `type` varchar(128) NOT NULL');
      await queryRunner.query(
        'ALTER TABLE `tagset_template` CHANGE `allowedValues` `allowedValues` text NOT NULL'
      );
      await queryRunner.query(
        'ALTER TABLE `tagset` CHANGE `type` varchar(128) NOT NULL'
      );
      await queryRunner.query(
        'ALTER TABLE `visual` CHANGE `uri` varchar(2048) NOT NULL'
      );
      await queryRunner.query(
        'ALTER TABLE `visual` CHANGE `aspectRatio` decimal(2,1) NOT NULL'
      );
      // was missing
      await queryRunner.query(
        'ALTER TABLE `visual` ADD UNIQUE INDEX `IDX_4fbd109f9bb84f58b7a3c60649` (`authorizationId`)'
      );
      await queryRunner.query(
        'ALTER TABLE `location` CHANGE `city` varchar(128) NULL'
      );
      await queryRunner.query(
        'ALTER TABLE `location` CHANGE `country` varchar(128) NULL'
      );
      await queryRunner.query(
        'ALTER TABLE `location` CHANGE `addressLine1` varchar(512) NULL'
      );
      await queryRunner.query(
        'ALTER TABLE `location` CHANGE `addressLine2` varchar(512) NULL'
      );
      await queryRunner.query(
        'ALTER TABLE `location` CHANGE `stateOrProvince` `stateOrProvince` varchar(128) NULL'
      );
      await queryRunner.query(
        'ALTER TABLE `location` CHANGE `postalCode` `postalCode` varchar(128) NULL'
      );
      await queryRunner.query(
        'ALTER TABLE `document` CHANGE `createdBy` `createdBy` char(36) NOT NULL'
      );
      await queryRunner.query(
        'ALTER TABLE `document` CHANGE `displayName` varchar(512) NOT NULL'
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
      // was missing
      await queryRunner.query(
        'ALTER TABLE `document` ADD UNIQUE INDEX `IDX_d9e2dfcccf59233c17cc6bc641` (`authorizationId`)'
      );
      // was missing
      await queryRunner.query(
        'ALTER TABLE `document` ADD UNIQUE INDEX `IDX_9fb9257b14ec21daf5bc9aa4c8` (`tagsetId`)'
      );
      await queryRunner.query(
        'ALTER TABLE `storage_bucket` CHANGE `allowedMimeTypes` `allowedMimeTypes` text NOT NULL'
      );
      await queryRunner.query(
        'ALTER TABLE `storage_bucket` CHANGE `maxFileSize` `maxFileSize` int NOT NULL'
      );
      await queryRunner.query(
        'ALTER TABLE `storage_bucket` ADD UNIQUE INDEX `IDX_f2f48b57269987b13b415a0058` (`authorizationId`)'
      );
      await queryRunner.query('ALTER TABLE `profile` CHANGE `tagline` text NULL');
      await queryRunner.query(
        'ALTER TABLE `profile` CHANGE `type` varchar(128) NOT NULL'
      );
      await queryRunner.query(
        'ALTER TABLE `profile` ADD UNIQUE INDEX `IDX_432056041df0e4337b17ff7b09` (`locationId`)'
      );
      await queryRunner.query(
        'ALTER TABLE `vc_interaction` CHANGE `threadID` varchar(44) NOT NULL'
      );
      await queryRunner.query('ALTER TABLE `room` CHANGE `type` varchar(128) NOT NULL');
      await queryRunner.query(
        'ALTER TABLE `room` ADD UNIQUE INDEX `IDX_d1d94dd8e0c417b4188a05ccbc` (`authorizationId`)'
      );
      await queryRunner.query(
        'ALTER TABLE `whiteboard` CHANGE `contentUpdatePolicy` varchar(128) NOT NULL'
      );
      await queryRunner.query(
        'ALTER TABLE `whiteboard` ADD UNIQUE INDEX `IDX_d3b86160bb7d704212382b0ca4` (`authorizationId`)'
      );
      await queryRunner.query(
        'ALTER TABLE `whiteboard` ADD UNIQUE INDEX `IDX_3f9e9e2798d2a4d84b16ee8477` (`profileId`)'
      );
      await queryRunner.query(
        'ALTER TABLE `callout_contribution_policy` CHANGE `state` varchar(128) NOT NULL'
      );
      // was 255 before
      await queryRunner.query(
        'ALTER TABLE `post` CHANGE `nameID` varchar(36) NOT NULL'
      );
      await queryRunner.query('ALTER TABLE `post` CHANGE `type` varchar(128) NOT NULL');
      await queryRunner.query(
        'ALTER TABLE `post` CHANGE `createdBy` `createdBy` char(36) NOT NULL'
      );
      await queryRunner.query(
        'ALTER TABLE `post` ADD UNIQUE INDEX `IDX_390343b22abec869bf80041933` (`authorizationId`)'
      );
      await queryRunner.query(
        'ALTER TABLE `post` ADD UNIQUE INDEX `IDX_970844fcd10c2b6df7c1b49eac` (`profileId`)'
      );
      await queryRunner.query(
        'ALTER TABLE `post` ADD UNIQUE INDEX `IDX_042b9825d770d6b3009ae206c2` (`commentsId`)'
      );
      await queryRunner.query(
        'ALTER TABLE `callout_contribution` CHANGE `createdBy` `createdBy` char(36) NOT NULL'
      );
      await queryRunner.query(`ALTER TABLE \`callout\` CHANGE \`nameID\` varchar(36) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`callout\` CHANGE \`visibility\` varchar(128) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`callout\` CHANGE \`publishedDate\` \`publishedDate\` datetime NULL`);
      await queryRunner.query(`ALTER TABLE \`calendar_event\` CHANGE \`nameID\` varchar(36) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`calendar_event\` CHANGE \`type\` varchar(128) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`calendar_event\` CHANGE \`createdBy\` \`createdBy\` char(36) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`calendar_event\` CHANGE \`startDate\` \`startDate\` datetime NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`calendar_event\` CHANGE \`wholeDay\` \`wholeDay\` tinyint NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`calendar_event\` CHANGE \`multipleDays\` \`multipleDays\` tinyint NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`calendar_event\` CHANGE \`durationMinutes\` \`durationMinutes\` int NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`innovation_flow\` CHANGE \`states\` \`states\` text NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`collaboration\` CHANGE \`groupsStr\` \`groupsStr\` text NOT NULL`);
      // was missing
      await queryRunner.query(`ALTER TABLE \`collaboration\` ADD UNIQUE INDEX \`IDX_35c6b1de6d4d89dfe8e9c85d77\` (\`innovationFlowId\`)`);
      await queryRunner.query(`ALTER TABLE \`organization_verification\` ADD \`organizationID\` varchar(36) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`organization_verification\` CHANGE \`status\` varchar(128) NOT NULL DEFAULT 'not-verified'`);
      await queryRunner.query(`ALTER TABLE \`credential\` CHANGE \`resourceID\` varchar(36) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`credential\` CHANGE \`type\` varchar(128) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`agent\` CHANGE \`type\` \`type\` varchar(128) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`organization\` CHANGE \`nameID\` varchar(36) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`organization\` CHANGE \`accountID\` \`accountID\` char(36) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`nvp\` CHANGE \`value\` varchar(255) NOT NULL`);

      await queryRunner.query(`ALTER TABLE \`user\` CHANGE \`accountID\` \`accountID\` char(36) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`user\` CHANGE \`accountUpn\` varchar(128) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`user\` CHANGE \`firstName\` varchar(128) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`user\` CHANGE \`lastName\` varchar(128) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`user\` CHANGE \`email\` varchar(512) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`user\` CHANGE \`phone\` varchar(128) NOT NULL`);

      await queryRunner.query(`ALTER TABLE \`communication\` CHANGE \`spaceID\` varchar(36) NOT NULL`);

      await queryRunner.query(`ALTER TABLE \`community_policy\` CHANGE \`member\` \`member\` text NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`community_policy\` CHANGE \`lead\` \`lead\` text NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`community_policy\` CHANGE \`admin\` \`admin\` text NOT NULL`);

      await queryRunner.query(`ALTER TABLE \`form\` CHANGE \`questions\` \`questions\` text NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`form\` CHANGE \`description\` \`description\` text NOT NULL`);
      // todo: will this work varchar on ID
      await queryRunner.query(`ALTER TABLE \`invitation\` DROP FOREIGN KEY \`FK_b132226941570cb650a4023d493\``); // authorizationId
      await queryRunner.query(`ALTER TABLE \`invitation\` DROP FOREIGN KEY \`FK_b0c80ccf319a1c7a7af12b39987\``); // authorizationId
      await queryRunner.query(`ALTER TABLE \`invitation\` DROP PRIMARY KEY`);
      await queryRunner.query(`ALTER TABLE \`invitation\` CHANGE \`id\` char(36) NOT NULL PRIMARY KEY`);

      await queryRunner.query(`ALTER TABLE \`invitation\` CHANGE \`invitedContributor\` \`invitedContributor\` char(36) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`invitation\` CHANGE \`createdBy\` \`createdBy\` char(36) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`invitation\` CHANGE \`contributorType\` varchar(128) NOT NULL`);
      // todo: will this work varchar on ID
      await queryRunner.query(`DROP INDEX \`REL_b132226941570cb650a4023d49\` ON \`invitation\``); // authorizationId
      await queryRunner.query(`DROP INDEX \`IDX_b132226941570cb650a4023d49\` ON \`invitation\``); // authorizationId
      await queryRunner.query(`ALTER TABLE \`invitation\` CHANGE \`authorizationId\` char(36) NULL`);
      await queryRunner.query(`ALTER TABLE \`invitation\` ADD UNIQUE INDEX \`IDX_b132226941570cb650a4023d49\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_b132226941570cb650a4023d49\` ON \`invitation\` (\`authorizationId\`)`);

      await queryRunner.query(`DROP INDEX \`REL_b0c80ccf319a1c7a7af12b3998\` ON \`invitation\``); //lifecycleId
      await queryRunner.query(`ALTER TABLE \`invitation\` DROP INDEX \`IDX_b0c80ccf319a1c7a7af12b3998\``); //lifecycleId
      await queryRunner.query(`ALTER TABLE \`invitation\` CHANGE \`lifecycleId\` char(36) NULL`);
      await queryRunner.query(`ALTER TABLE \`invitation\` ADD UNIQUE INDEX \`IDX_b0c80ccf319a1c7a7af12b3998\` (\`lifecycleId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_b0c80ccf319a1c7a7af12b3998\` ON \`invitation\` (\`lifecycleId\`)`);

      await queryRunner.query(`ALTER TABLE \`invitation\` CHANGE \`communityId\` char(36) NULL`);

      await queryRunner.query(`ALTER TABLE \`library\` ADD UNIQUE INDEX \`IDX_3879db652f2421337691219ace\` (\`authorizationId\`)`);

      await queryRunner.query(`ALTER TABLE \`license_plan\` CHANGE \`sortOrder\` \`sortOrder\` int NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`license_plan\` CHANGE \`licenseCredential\` text NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`license_plan\` ADD \`type\` varchar(128) NOT NULL`);
      // missing
      await queryRunner.query(`ALTER TABLE \`licensing\` ADD UNIQUE INDEX \`IDX_0c6a4d0a6c13a3f5df6ac01509\` (\`authorizationId\`)`);
      await queryRunner.query(`ALTER TABLE \`licensing\` ADD UNIQUE INDEX \`IDX_a5dae5a376dd49c7c076893d40\` (\`licensePolicyId\`)`);

      await queryRunner.query(`ALTER TABLE \`discussion\` CHANGE \`nameID\` \`nameID\` varchar(36) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`discussion\` CHANGE \`createdBy\` \`createdBy\` char(36) NOT NULL`);
      // missing
      await queryRunner.query(`ALTER TABLE \`platform\` ADD UNIQUE INDEX \`IDX_9f621c51dd854634d8766a9cfa\` (\`authorizationId\`)`);
      await queryRunner.query(`ALTER TABLE \`platform\` ADD UNIQUE INDEX \`IDX_425bbb4b951f7f4629710763fc\` (\`licensingId\`)`);

      await queryRunner.query(`ALTER TABLE \`platform_invitation\` CHANGE \`platformRole\` varchar(128) NULL`);
      await queryRunner.query(`ALTER TABLE \`platform_invitation\` CHANGE \`email\` varchar(128) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`platform_invitation\` CHANGE \`firstName\` varchar(128) NULL`);
      await queryRunner.query(`ALTER TABLE \`platform_invitation\` CHANGE \`lastName\` varchar(128) NULL`);
      await queryRunner.query(`ALTER TABLE \`platform_invitation\` CHANGE \`createdBy\` \`createdBy\` char(36) NOT NULL`);
      // missing
      await queryRunner.query(`ALTER TABLE \`platform_invitation\` ADD UNIQUE INDEX \`IDX_c0448d2c992a62c9c11bd0f142\` (\`authorizationId\`)`);

      await queryRunner.query(`ALTER TABLE \`innovation_flow_template\` CHANGE \`states\` \`states\` text NOT NULL`);
      // missing
      await queryRunner.query(`ALTER TABLE \`space_defaults\` ADD UNIQUE INDEX \`IDX_592a23e68922853bae6ebecd85\` (\`innovationFlowTemplateId\`)`);
      await queryRunner.query(`ALTER TABLE \`space\` CHANGE \`nameID\` \`nameID\` varchar(36) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`space\` CHANGE \`type\` varchar(128) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`space\` CHANGE \`levelZeroSpaceID\` varchar(36) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`space\` CHANGE \`visibility\` varchar(128) NOT NULL`);

      await queryRunner.query(`ALTER TABLE \`ai_persona\` CHANGE \`dataAccessMode\` varchar(128) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`ai_persona\` CHANGE \`interactionModes\` \`interactionModes\` text NOT NULL`);

      await queryRunner.query(`ALTER TABLE \`virtual_contributor\` CHANGE \`nameID\` varchar(36) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`virtual_contributor\` CHANGE \`searchVisibility\` varchar(128) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_7a962c9b04b0d197bc3c93262a7\``);
      await queryRunner.query(`ALTER TABLE \`virtual_contributor\` CHANGE \`accountId\` \`accountId\` char(36) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_7a962c9b04b0d197bc3c93262a7\` FOREIGN KEY (\`accountId\`) REFERENCES \`account\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      // missing
      await queryRunner.query(`ALTER TABLE \`innovation_pack\` ADD UNIQUE INDEX \`IDX_8af8122897b05315e7eb892525\` (\`authorizationId\`)`);
      // missing
      await queryRunner.query(`ALTER TABLE \`account\` ADD UNIQUE INDEX \`IDX_950221e932175dc7cf7c006488\` (\`storageAggregatorId\`)`);

      await queryRunner.query(`DROP INDEX \`IDX_1d39dac2c6d2f17286d90c306b\` ON \`innovation_hub\``);
      await queryRunner.query(`ALTER TABLE \`innovation_hub\` CHANGE \`nameID\` varchar(36) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`innovation_hub\` ADD UNIQUE INDEX \`IDX_1d39dac2c6d2f17286d90c306b\` (\`nameID\`)`);

      await queryRunner.query(`DROP INDEX \`IDX_8f35d04d098bb6c7c57a9a83ac\` ON \`innovation_hub\``);
      await queryRunner.query(`ALTER TABLE \`innovation_hub\` CHANGE \`subdomain\` varchar(63) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`innovation_hub\` ADD UNIQUE INDEX \`IDX_8f35d04d098bb6c7c57a9a83ac\` (\`subdomain\`)`);

      await queryRunner.query(`ALTER TABLE \`innovation_hub\` CHANGE \`listedInStore\` \`listedInStore\` tinyint NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`innovation_hub\` CHANGE \`searchVisibility\` varchar(128) NOT NULL DEFAULT 'account'`);
      await queryRunner.query(`ALTER TABLE \`innovation_hub\` CHANGE \`accountId\` char(36) NULL`);
      // missing
      await queryRunner.query(`ALTER TABLE \`activity\` ADD UNIQUE INDEX \`IDX_07a39cea9426b689be25fd61de\` (\`rowId\`)`);
      await queryRunner.query(`ALTER TABLE \`activity\` CHANGE \`triggeredBy\` \`triggeredBy\` char(36) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`activity\` CHANGE \`resourceID\` \`resourceID\` char(36) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`activity\` CHANGE \`collaborationID\` \`collaborationID\` char(36) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`activity\` CHANGE \`visibility\` \`visibility\` tinyint NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`activity\` CHANGE \`description\` varchar(512) NULL`);
      await queryRunner.query(`ALTER TABLE \`activity\` CHANGE \`type\` varchar(128) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`ai_persona_service\` CHANGE \`dataAccessMode\` varchar(128) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`ai_persona_service\` CHANGE \`bodyOfKnowledgeType\` varchar(128) NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`ai_persona_service\` CHANGE \`bodyOfKnowledgeID\` varchar(128) NOT NULL`);




      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_d9e2dfcccf59233c17cc6bc641\` ON \`document\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_9fb9257b14ec21daf5bc9aa4c8\` ON \`document\` (\`tagsetId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_f2f48b57269987b13b415a0058\` ON \`storage_bucket\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_432056041df0e4337b17ff7b09\` ON \`profile\` (\`locationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_d1d94dd8e0c417b4188a05ccbc\` ON \`room\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_d3b86160bb7d704212382b0ca4\` ON \`whiteboard\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_3f9e9e2798d2a4d84b16ee8477\` ON \`whiteboard\` (\`profileId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_390343b22abec869bf80041933\` ON \`post\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_970844fcd10c2b6df7c1b49eac\` ON \`post\` (\`profileId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_042b9825d770d6b3009ae206c2\` ON \`post\` (\`commentsId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_cf776244b01436d8ca5cc76284\` ON \`callout\` (\`framingId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_1e740008a7e1512966e3b08414\` ON \`callout\` (\`contributionPolicyId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_36b0da55acff774d0845aeb55f\` ON \`callout\` (\`contributionDefaultsId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_62ed316cda7b75735b20307b47\` ON \`callout\` (\`commentsId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_8ee86afa2808a4ab523b9ee6c5\` ON \`calendar_event\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_9349e137959f3ca5818c2e62b3\` ON \`calendar_event\` (\`profileId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_b5069b11030e9608ee4468f850\` ON \`calendar_event\` (\`commentsId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_6e74d59afda096b68d12a69969\` ON \`calendar\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_5fe58ece01b48496aebc04733d\` ON \`timeline\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_56aae15a664b2889a1a11c2cf8\` ON \`timeline\` (\`calendarId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_a6e050daa4c7a3ab1e411c3651\` ON \`innovation_flow\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_96a8cbe1706f459fd7d883be9b\` ON \`innovation_flow\` (\`profileId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_b7ece56376ac7ca0b9a56c33b3\` ON \`collaboration\` (\`tagsetTemplateSetId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_f67a2d25c945269d602c182fbc\` ON \`collaboration\` (\`timelineId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_35c6b1de6d4d89dfe8e9c85d77\` ON \`collaboration\` (\`innovationFlowId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_c66eddab0caacb1ef8d46bcafd\` ON \`organization_verification\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_1cc3b275fc2a9d9d9b0ae33b31\` ON \`organization_verification\` (\`lifecycleId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_b4cf0f96bf08cf396f68355522\` ON \`preference\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_8e76dcf171c45875c44febb1d8\` ON \`preference_set\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_e0e150e4f11d906b931b46a2d8\` ON \`organization\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_d2cb77c14644156ec8e865608e\` ON \`organization\` (\`profileId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_7f1bec8979b57ed7ebd392a2ca\` ON \`organization\` (\`agentId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_5a72d5b37312bac2e0a0115718\` ON \`organization\` (\`verificationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_58fd47c4a6ac8df9fe2bcaed87\` ON \`organization\` (\`preferenceSetId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_395aa74996a1f978b4969d114b\` ON \`organization\` (\`storageAggregatorId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_028322b763dc94242dc9f638f9\` ON \`user\` (\`preferenceSetId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_10458c50c10436b6d589b40e5c\` ON \`user\` (\`storageAggregatorId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_eb99e588873c788a68a035478a\` ON \`communication\` (\`updatesId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_b132226941570cb650a4023d49\` ON \`invitation\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_b0c80ccf319a1c7a7af12b3998\` ON \`invitation\` (\`lifecycleId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_3879db652f2421337691219ace\` ON \`library\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_0c6a4d0a6c13a3f5df6ac01509\` ON \`licensing\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_a5dae5a376dd49c7c076893d40\` ON \`licensing\` (\`licensePolicyId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_2d8a3ca181c3f0346817685d21\` ON \`discussion\` (\`profileId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_5337074c9b818bb63e6f314c80\` ON \`discussion\` (\`commentsId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_9f621c51dd854634d8766a9cfa\` ON \`platform\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_425bbb4b951f7f4629710763fc\` ON \`platform\` (\`licensingId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_c0448d2c992a62c9c11bd0f142\` ON \`platform_invitation\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_7fbe50fa78a37776ad962cb764\` ON \`community\` (\`communicationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_c7d74dd6b92d4202c705cd3676\` ON \`community\` (\`applicationFormId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_3823de95920943655430125fa9\` ON \`community\` (\`policyId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_c3bdb693adb031b6613edcef4f\` ON \`post_template\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_4a9c8cefc6c7e33aa728d22a90\` ON \`post_template\` (\`profileId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_cc2faf30ce52648db9299d7072\` ON \`whiteboard_template\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_5b4948db27c348e65055187d5e\` ON \`whiteboard_template\` (\`profileId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_3aec561629db1d65a9b2b3a788\` ON \`innovation_flow_template\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_bd591d7403dabe091f6a116975\` ON \`innovation_flow_template\` (\`profileId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_479f799f0d86e43c9d8623e827\` ON \`callout_template\` (\`contributionDefaultsId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_29ff764dc6de1a9dc289cbfb01\` ON \`callout_template\` (\`contributionPolicyId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_eb0176ef4b98c143322aa6f809\` ON \`templates_set\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_592a23e68922853bae6ebecd85\` ON \`space_defaults\` (\`innovationFlowTemplateId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_8d03fd2c8e8411ec9192c79cd9\` ON \`space\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_b4250035291aac1329d59224a9\` ON \`space\` (\`profileId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_ea06eb8894469a0f262d929bf0\` ON \`space\` (\`collaborationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_cc0b08eb9679d3daa95153c2af\` ON \`space\` (\`contextId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_68fa2c2b00cc1ed77e7c225e8b\` ON \`space\` (\`communityId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_9c664d684f987a735678b0ba82\` ON \`space\` (\`agentId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_980c4643d7d9de1b97bc39f518\` ON \`space\` (\`storageAggregatorId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_43559aeadc1a5169d17e81b3d4\` ON \`space\` (\`libraryId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_6b1efee39d076d9f7ecb8fef4c\` ON \`space\` (\`defaultsId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_8af8122897b05315e7eb892525\` ON \`innovation_pack\` (\`authorizationId\`)`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`REL_950221e932175dc7cf7c006488\` ON \`account\` (\`storageAggregatorId\`)`);
      await queryRunner.query(`ALTER TABLE \`tagset_template\` ADD CONSTRAINT \`FK_96f23f044acf305c1699e0319d2\` FOREIGN KEY (\`tagsetTemplateSetId\`) REFERENCES \`tagset_template_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`tagset\` ADD CONSTRAINT \`FK_644155610ddc40dc4e19781c8f0\` FOREIGN KEY (\`tagsetTemplateId\`) REFERENCES \`tagset_template\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`visual\` ADD CONSTRAINT \`FK_4fbd109f9bb84f58b7a3c60649c\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`visual\` ADD CONSTRAINT \`FK_1104f3ef8497ca40d99b9f46b87\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`document\` ADD CONSTRAINT \`FK_d9e2dfcccf59233c17cc6bc6418\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`document\` ADD CONSTRAINT \`FK_851e50ec4be7c62a1f9b9a430bf\` FOREIGN KEY (\`storageBucketId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`document\` ADD CONSTRAINT \`FK_9fb9257b14ec21daf5bc9aa4c8e\` FOREIGN KEY (\`tagsetId\`) REFERENCES \`tagset\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`storage_bucket\` ADD CONSTRAINT \`FK_f2f48b57269987b13b415a00587\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_432056041df0e4337b17ff7b09d\` FOREIGN KEY (\`locationId\`) REFERENCES \`location\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`vc_interaction\` ADD CONSTRAINT \`FK_d6f78c95ff41cdd30e505a4ebbb\` FOREIGN KEY (\`roomId\`) REFERENCES \`room\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`room\` ADD CONSTRAINT \`FK_d1d94dd8e0c417b4188a05ccbca\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`whiteboard\` ADD CONSTRAINT \`FK_d3b86160bb7d704212382b0ca44\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`whiteboard\` ADD CONSTRAINT \`FK_3f9e9e2798d2a4d84b16ee8477c\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`post\` ADD CONSTRAINT \`FK_390343b22abec869bf800419333\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`post\` ADD CONSTRAINT \`FK_970844fcd10c2b6df7c1b49eacf\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`post\` ADD CONSTRAINT \`FK_042b9825d770d6b3009ae206c2f\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_cf776244b01436d8ca5cc762848\` FOREIGN KEY (\`framingId\`) REFERENCES \`callout_framing\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_1e740008a7e1512966e3b084148\` FOREIGN KEY (\`contributionPolicyId\`) REFERENCES \`callout_contribution_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_36b0da55acff774d0845aeb55f2\` FOREIGN KEY (\`contributionDefaultsId\`) REFERENCES \`callout_contribution_defaults\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_62ed316cda7b75735b20307b47e\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_8ee86afa2808a4ab523b9ee6c5e\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_9349e137959f3ca5818c2e62b3f\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_b5069b11030e9608ee4468f850d\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_80ab7835e1749581a27462eb87f\` FOREIGN KEY (\`calendarId\`) REFERENCES \`calendar\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`calendar\` ADD CONSTRAINT \`FK_6e74d59afda096b68d12a699691\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`timeline\` ADD CONSTRAINT \`FK_5fe58ece01b48496aebc04733da\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`timeline\` ADD CONSTRAINT \`FK_56aae15a664b2889a1a11c2cf82\` FOREIGN KEY (\`calendarId\`) REFERENCES \`calendar\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`innovation_flow\` ADD CONSTRAINT \`FK_a6e050daa4c7a3ab1e411c36517\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`innovation_flow\` ADD CONSTRAINT \`FK_96a8cbe1706f459fd7d883be9bd\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_b7ece56376ac7ca0b9a56c33b3a\` FOREIGN KEY (\`tagsetTemplateSetId\`) REFERENCES \`tagset_template_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_f67a2d25c945269d602c182fbc0\` FOREIGN KEY (\`timelineId\`) REFERENCES \`timeline\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_35c6b1de6d4d89dfe8e9c85d771\` FOREIGN KEY (\`innovationFlowId\`) REFERENCES \`innovation_flow\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`organization_verification\` ADD CONSTRAINT \`FK_c66eddab0caacb1ef8d46bcafdb\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`organization_verification\` ADD CONSTRAINT \`FK_1cc3b275fc2a9d9d9b0ae33b310\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`preference\` ADD CONSTRAINT \`FK_b4cf0f96bf08cf396f683555229\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`preference\` ADD CONSTRAINT \`FK_46d60bf133073f749b8f07e534c\` FOREIGN KEY (\`preferenceDefinitionId\`) REFERENCES \`preference_definition\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`preference\` ADD CONSTRAINT \`FK_f4b5742f589e2ac8bfe48b708c0\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`preference_set\` ADD CONSTRAINT \`FK_8e76dcf171c45875c44febb1d8d\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_e0e150e4f11d906b931b46a2d89\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_d2cb77c14644156ec8e865608e0\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_7f1bec8979b57ed7ebd392a2ca9\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_5a72d5b37312bac2e0a01157185\` FOREIGN KEY (\`verificationId\`) REFERENCES \`organization_verification\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_58fd47c4a6ac8df9fe2bcaed874\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_395aa74996a1f978b4969d114b1\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`user_group\` ADD CONSTRAINT \`FK_694ebec955a90e999d9926b7da8\` FOREIGN KEY (\`organizationId\`) REFERENCES \`organization\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`user\` ADD CONSTRAINT \`FK_028322b763dc94242dc9f638f9b\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`user\` ADD CONSTRAINT \`FK_10458c50c10436b6d589b40e5ca\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`communication\` ADD CONSTRAINT \`FK_eb99e588873c788a68a035478ab\` FOREIGN KEY (\`updatesId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`invitation\` ADD CONSTRAINT \`FK_b132226941570cb650a4023d493\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`invitation\` ADD CONSTRAINT \`FK_b0c80ccf319a1c7a7af12b39987\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`invitation\` ADD CONSTRAINT \`FK_339c1fe2a9c5caef5b982303fb0\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`community_guidelines\` ADD CONSTRAINT \`FK_3d60fe4fa40d54bad7d51bb4bd1\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`library\` ADD CONSTRAINT \`FK_3879db652f2421337691219ace8\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`license_plan\` ADD CONSTRAINT \`FK_3030904030f5d30f483b49905d1\` FOREIGN KEY (\`licensingId\`) REFERENCES \`licensing\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`licensing\` ADD CONSTRAINT \`FK_0c6a4d0a6c13a3f5df6ac015096\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`licensing\` ADD CONSTRAINT \`FK_a5dae5a376dd49c7c076893d40b\` FOREIGN KEY (\`licensePolicyId\`) REFERENCES \`license_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_2d8a3ca181c3f0346817685d21d\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_5337074c9b818bb63e6f314c808\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_9f621c51dd854634d8766a9cfaf\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_f516dd9a46616999c7e9a6adc15\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_425bbb4b951f7f4629710763fc0\` FOREIGN KEY (\`licensingId\`) REFERENCES \`licensing\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`platform_invitation\` ADD CONSTRAINT \`FK_c0448d2c992a62c9c11bd0f1422\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`platform_invitation\` ADD CONSTRAINT \`FK_b3d3f3c2ce851d1059c4ed26ba2\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`community\` ADD CONSTRAINT \`FK_7fbe50fa78a37776ad962cb7643\` FOREIGN KEY (\`communicationId\`) REFERENCES \`communication\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`community\` ADD CONSTRAINT \`FK_c7d74dd6b92d4202c705cd36769\` FOREIGN KEY (\`applicationFormId\`) REFERENCES \`form\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`community\` ADD CONSTRAINT \`FK_3823de95920943655430125fa93\` FOREIGN KEY (\`policyId\`) REFERENCES \`community_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`post_template\` ADD CONSTRAINT \`FK_c3bdb693adb031b6613edcef4f4\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`post_template\` ADD CONSTRAINT \`FK_4a9c8cefc6c7e33aa728d22a905\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`post_template\` ADD CONSTRAINT \`FK_34b22da74bc9e821a99fbe78a19\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`whiteboard_template\` ADD CONSTRAINT \`FK_cc2faf30ce52648db9299d7072b\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`whiteboard_template\` ADD CONSTRAINT \`FK_5b4948db27c348e65055187d5ea\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`whiteboard_template\` ADD CONSTRAINT \`FK_6776ee550271ece75b3b2a5ba18\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`innovation_flow_template\` ADD CONSTRAINT \`FK_3aec561629db1d65a9b2b3a788f\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`innovation_flow_template\` ADD CONSTRAINT \`FK_bd591d7403dabe091f6a116975d\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`innovation_flow_template\` ADD CONSTRAINT \`FK_4b7450c0baad85f4afee2ce25e6\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`callout_template\` ADD CONSTRAINT \`FK_479f799f0d86e43c9d8623e8277\` FOREIGN KEY (\`contributionDefaultsId\`) REFERENCES \`callout_contribution_defaults\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`callout_template\` ADD CONSTRAINT \`FK_29ff764dc6de1a9dc289cbfb01b\` FOREIGN KEY (\`contributionPolicyId\`) REFERENCES \`callout_contribution_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`templates_set\` ADD CONSTRAINT \`FK_eb0176ef4b98c143322aa6f8090\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`space_defaults\` ADD CONSTRAINT \`FK_592a23e68922853bae6ebecd85e\` FOREIGN KEY (\`innovationFlowTemplateId\`) REFERENCES \`innovation_flow_template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`space\` ADD CONSTRAINT \`FK_8d03fd2c8e8411ec9192c79cd99\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`space\` ADD CONSTRAINT \`FK_b4250035291aac1329d59224a96\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`space\` ADD CONSTRAINT \`FK_ef1ff4ac7f613cc0677e2295b30\` FOREIGN KEY (\`parentSpaceId\`) REFERENCES \`space\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`space\` ADD CONSTRAINT \`FK_6bdeffaf6ea6159b4672a2aed70\` FOREIGN KEY (\`accountId\`) REFERENCES \`account\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`space\` ADD CONSTRAINT \`FK_ea06eb8894469a0f262d929bf06\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`space\` ADD CONSTRAINT \`FK_cc0b08eb9679d3daa95153c2af5\` FOREIGN KEY (\`contextId\`) REFERENCES \`context\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`space\` ADD CONSTRAINT \`FK_68fa2c2b00cc1ed77e7c225e8ba\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`space\` ADD CONSTRAINT \`FK_9c664d684f987a735678b0ba825\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`space\` ADD CONSTRAINT \`FK_980c4643d7d9de1b97bc39f5185\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`space\` ADD CONSTRAINT \`FK_43559aeadc1a5169d17e81b3d45\` FOREIGN KEY (\`libraryId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`space\` ADD CONSTRAINT \`FK_6b1efee39d076d9f7ecb8fef4cd\` FOREIGN KEY (\`defaultsId\`) REFERENCES \`space_defaults\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_7a962c9b04b0d197bc3c93262a7\` FOREIGN KEY (\`accountId\`) REFERENCES \`account\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_8af8122897b05315e7eb8925253\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_5facd6d188068a5a1c5b6f07fc3\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_51014590f9644e6ff9e0536f40f\` FOREIGN KEY (\`accountId\`) REFERENCES \`account\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_a1441e46c8d36090e1f6477cea5\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`account\` ADD CONSTRAINT \`FK_950221e932175dc7cf7c0064887\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`innovation_hub\` ADD CONSTRAINT \`FK_156fd30246eb151b9d17716abf5\` FOREIGN KEY (\`accountId\`) REFERENCES \`account\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
      await queryRunner.query(`ALTER TABLE \`application_questions\` ADD CONSTRAINT \`FK_8495fae86f13836b0745642baa8\` FOREIGN KEY (\`applicationId\`) REFERENCES \`application\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
      await queryRunner.query(`ALTER TABLE \`application_questions\` ADD CONSTRAINT \`FK_fe50118fd82e7fe2f74f986a195\` FOREIGN KEY (\`nvpId\`) REFERENCES \`nvp\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`application_questions\` DROP FOREIGN KEY \`FK_fe50118fd82e7fe2f74f986a195\``);
        await queryRunner.query(`ALTER TABLE \`application_questions\` DROP FOREIGN KEY \`FK_8495fae86f13836b0745642baa8\``);
        await queryRunner.query(`ALTER TABLE \`innovation_hub\` DROP FOREIGN KEY \`FK_156fd30246eb151b9d17716abf5\``);
        await queryRunner.query(`ALTER TABLE \`account\` DROP FOREIGN KEY \`FK_950221e932175dc7cf7c0064887\``);
        await queryRunner.query(`ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_a1441e46c8d36090e1f6477cea5\``);
        await queryRunner.query(`ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_51014590f9644e6ff9e0536f40f\``);
        await queryRunner.query(`ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_5facd6d188068a5a1c5b6f07fc3\``);
        await queryRunner.query(`ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_8af8122897b05315e7eb8925253\``);
        await queryRunner.query(`ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_7a962c9b04b0d197bc3c93262a7\``);
        await queryRunner.query(`ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_6b1efee39d076d9f7ecb8fef4cd\``);
        await queryRunner.query(`ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_43559aeadc1a5169d17e81b3d45\``);
        await queryRunner.query(`ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_980c4643d7d9de1b97bc39f5185\``);
        await queryRunner.query(`ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_9c664d684f987a735678b0ba825\``);
        await queryRunner.query(`ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_68fa2c2b00cc1ed77e7c225e8ba\``);
        await queryRunner.query(`ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_cc0b08eb9679d3daa95153c2af5\``);
        await queryRunner.query(`ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_ea06eb8894469a0f262d929bf06\``);
        await queryRunner.query(`ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_6bdeffaf6ea6159b4672a2aed70\``);
        await queryRunner.query(`ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_ef1ff4ac7f613cc0677e2295b30\``);
        await queryRunner.query(`ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_b4250035291aac1329d59224a96\``);
        await queryRunner.query(`ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_8d03fd2c8e8411ec9192c79cd99\``);
        await queryRunner.query(`ALTER TABLE \`space_defaults\` DROP FOREIGN KEY \`FK_592a23e68922853bae6ebecd85e\``);
        await queryRunner.query(`ALTER TABLE \`templates_set\` DROP FOREIGN KEY \`FK_eb0176ef4b98c143322aa6f8090\``);
        await queryRunner.query(`ALTER TABLE \`callout_template\` DROP FOREIGN KEY \`FK_29ff764dc6de1a9dc289cbfb01b\``);
        await queryRunner.query(`ALTER TABLE \`callout_template\` DROP FOREIGN KEY \`FK_479f799f0d86e43c9d8623e8277\``);
        await queryRunner.query(`ALTER TABLE \`innovation_flow_template\` DROP FOREIGN KEY \`FK_4b7450c0baad85f4afee2ce25e6\``);
        await queryRunner.query(`ALTER TABLE \`innovation_flow_template\` DROP FOREIGN KEY \`FK_bd591d7403dabe091f6a116975d\``);
        await queryRunner.query(`ALTER TABLE \`innovation_flow_template\` DROP FOREIGN KEY \`FK_3aec561629db1d65a9b2b3a788f\``);
        await queryRunner.query(`ALTER TABLE \`whiteboard_template\` DROP FOREIGN KEY \`FK_6776ee550271ece75b3b2a5ba18\``);
        await queryRunner.query(`ALTER TABLE \`whiteboard_template\` DROP FOREIGN KEY \`FK_5b4948db27c348e65055187d5ea\``);
        await queryRunner.query(`ALTER TABLE \`whiteboard_template\` DROP FOREIGN KEY \`FK_cc2faf30ce52648db9299d7072b\``);
        await queryRunner.query(`ALTER TABLE \`post_template\` DROP FOREIGN KEY \`FK_34b22da74bc9e821a99fbe78a19\``);
        await queryRunner.query(`ALTER TABLE \`post_template\` DROP FOREIGN KEY \`FK_4a9c8cefc6c7e33aa728d22a905\``);
        await queryRunner.query(`ALTER TABLE \`post_template\` DROP FOREIGN KEY \`FK_c3bdb693adb031b6613edcef4f4\``);
        await queryRunner.query(`ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_3823de95920943655430125fa93\``);
        await queryRunner.query(`ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_c7d74dd6b92d4202c705cd36769\``);
        await queryRunner.query(`ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_7fbe50fa78a37776ad962cb7643\``);
        await queryRunner.query(`ALTER TABLE \`platform_invitation\` DROP FOREIGN KEY \`FK_b3d3f3c2ce851d1059c4ed26ba2\``);
        await queryRunner.query(`ALTER TABLE \`platform_invitation\` DROP FOREIGN KEY \`FK_c0448d2c992a62c9c11bd0f1422\``);
        await queryRunner.query(`ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_425bbb4b951f7f4629710763fc0\``);
        await queryRunner.query(`ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_f516dd9a46616999c7e9a6adc15\``);
        await queryRunner.query(`ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_9f621c51dd854634d8766a9cfaf\``);
        await queryRunner.query(`ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_5337074c9b818bb63e6f314c808\``);
        await queryRunner.query(`ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_2d8a3ca181c3f0346817685d21d\``);
        await queryRunner.query(`ALTER TABLE \`licensing\` DROP FOREIGN KEY \`FK_a5dae5a376dd49c7c076893d40b\``);
        await queryRunner.query(`ALTER TABLE \`licensing\` DROP FOREIGN KEY \`FK_0c6a4d0a6c13a3f5df6ac015096\``);
        await queryRunner.query(`ALTER TABLE \`license_plan\` DROP FOREIGN KEY \`FK_3030904030f5d30f483b49905d1\``);
        await queryRunner.query(`ALTER TABLE \`library\` DROP FOREIGN KEY \`FK_3879db652f2421337691219ace8\``);
        await queryRunner.query(`ALTER TABLE \`community_guidelines\` DROP FOREIGN KEY \`FK_3d60fe4fa40d54bad7d51bb4bd1\``);
        await queryRunner.query(`ALTER TABLE \`invitation\` DROP FOREIGN KEY \`FK_339c1fe2a9c5caef5b982303fb0\``);
        await queryRunner.query(`ALTER TABLE \`invitation\` DROP FOREIGN KEY \`FK_b0c80ccf319a1c7a7af12b39987\``);
        await queryRunner.query(`ALTER TABLE \`invitation\` DROP FOREIGN KEY \`FK_b132226941570cb650a4023d493\``);
        await queryRunner.query(`ALTER TABLE \`communication\` DROP FOREIGN KEY \`FK_eb99e588873c788a68a035478ab\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_10458c50c10436b6d589b40e5ca\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_028322b763dc94242dc9f638f9b\``);
        await queryRunner.query(`ALTER TABLE \`user_group\` DROP FOREIGN KEY \`FK_694ebec955a90e999d9926b7da8\``);
        await queryRunner.query(`ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_395aa74996a1f978b4969d114b1\``);
        await queryRunner.query(`ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_58fd47c4a6ac8df9fe2bcaed874\``);
        await queryRunner.query(`ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_5a72d5b37312bac2e0a01157185\``);
        await queryRunner.query(`ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_7f1bec8979b57ed7ebd392a2ca9\``);
        await queryRunner.query(`ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_d2cb77c14644156ec8e865608e0\``);
        await queryRunner.query(`ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_e0e150e4f11d906b931b46a2d89\``);
        await queryRunner.query(`ALTER TABLE \`preference_set\` DROP FOREIGN KEY \`FK_8e76dcf171c45875c44febb1d8d\``);
        await queryRunner.query(`ALTER TABLE \`preference\` DROP FOREIGN KEY \`FK_f4b5742f589e2ac8bfe48b708c0\``);
        await queryRunner.query(`ALTER TABLE \`preference\` DROP FOREIGN KEY \`FK_46d60bf133073f749b8f07e534c\``);
        await queryRunner.query(`ALTER TABLE \`preference\` DROP FOREIGN KEY \`FK_b4cf0f96bf08cf396f683555229\``);
        await queryRunner.query(`ALTER TABLE \`organization_verification\` DROP FOREIGN KEY \`FK_1cc3b275fc2a9d9d9b0ae33b310\``);
        await queryRunner.query(`ALTER TABLE \`organization_verification\` DROP FOREIGN KEY \`FK_c66eddab0caacb1ef8d46bcafdb\``);
        await queryRunner.query(`ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_35c6b1de6d4d89dfe8e9c85d771\``);
        await queryRunner.query(`ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_f67a2d25c945269d602c182fbc0\``);
        await queryRunner.query(`ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_b7ece56376ac7ca0b9a56c33b3a\``);
        await queryRunner.query(`ALTER TABLE \`innovation_flow\` DROP FOREIGN KEY \`FK_96a8cbe1706f459fd7d883be9bd\``);
        await queryRunner.query(`ALTER TABLE \`innovation_flow\` DROP FOREIGN KEY \`FK_a6e050daa4c7a3ab1e411c36517\``);
        await queryRunner.query(`ALTER TABLE \`timeline\` DROP FOREIGN KEY \`FK_56aae15a664b2889a1a11c2cf82\``);
        await queryRunner.query(`ALTER TABLE \`timeline\` DROP FOREIGN KEY \`FK_5fe58ece01b48496aebc04733da\``);
        await queryRunner.query(`ALTER TABLE \`calendar\` DROP FOREIGN KEY \`FK_6e74d59afda096b68d12a699691\``);
        await queryRunner.query(`ALTER TABLE \`calendar_event\` DROP FOREIGN KEY \`FK_80ab7835e1749581a27462eb87f\``);
        await queryRunner.query(`ALTER TABLE \`calendar_event\` DROP FOREIGN KEY \`FK_b5069b11030e9608ee4468f850d\``);
        await queryRunner.query(`ALTER TABLE \`calendar_event\` DROP FOREIGN KEY \`FK_9349e137959f3ca5818c2e62b3f\``);
        await queryRunner.query(`ALTER TABLE \`calendar_event\` DROP FOREIGN KEY \`FK_8ee86afa2808a4ab523b9ee6c5e\``);
        await queryRunner.query(`ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_62ed316cda7b75735b20307b47e\``);
        await queryRunner.query(`ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_36b0da55acff774d0845aeb55f2\``);
        await queryRunner.query(`ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_1e740008a7e1512966e3b084148\``);
        await queryRunner.query(`ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_cf776244b01436d8ca5cc762848\``);
        await queryRunner.query(`ALTER TABLE \`post\` DROP FOREIGN KEY \`FK_042b9825d770d6b3009ae206c2f\``);
        await queryRunner.query(`ALTER TABLE \`post\` DROP FOREIGN KEY \`FK_970844fcd10c2b6df7c1b49eacf\``);
        await queryRunner.query(`ALTER TABLE \`post\` DROP FOREIGN KEY \`FK_390343b22abec869bf800419333\``);
        await queryRunner.query(`ALTER TABLE \`whiteboard\` DROP FOREIGN KEY \`FK_3f9e9e2798d2a4d84b16ee8477c\``);
        await queryRunner.query(`ALTER TABLE \`whiteboard\` DROP FOREIGN KEY \`FK_d3b86160bb7d704212382b0ca44\``);
        await queryRunner.query(`ALTER TABLE \`room\` DROP FOREIGN KEY \`FK_d1d94dd8e0c417b4188a05ccbca\``);
        await queryRunner.query(`ALTER TABLE \`vc_interaction\` DROP FOREIGN KEY \`FK_d6f78c95ff41cdd30e505a4ebbb\``);
        await queryRunner.query(`ALTER TABLE \`profile\` DROP FOREIGN KEY \`FK_432056041df0e4337b17ff7b09d\``);
        await queryRunner.query(`ALTER TABLE \`storage_bucket\` DROP FOREIGN KEY \`FK_f2f48b57269987b13b415a00587\``);
        await queryRunner.query(`ALTER TABLE \`document\` DROP FOREIGN KEY \`FK_9fb9257b14ec21daf5bc9aa4c8e\``);
        await queryRunner.query(`ALTER TABLE \`document\` DROP FOREIGN KEY \`FK_851e50ec4be7c62a1f9b9a430bf\``);
        await queryRunner.query(`ALTER TABLE \`document\` DROP FOREIGN KEY \`FK_d9e2dfcccf59233c17cc6bc6418\``);
        await queryRunner.query(`ALTER TABLE \`visual\` DROP FOREIGN KEY \`FK_1104f3ef8497ca40d99b9f46b87\``);
        await queryRunner.query(`ALTER TABLE \`visual\` DROP FOREIGN KEY \`FK_4fbd109f9bb84f58b7a3c60649c\``);
        await queryRunner.query(`ALTER TABLE \`tagset\` DROP FOREIGN KEY \`FK_644155610ddc40dc4e19781c8f0\``);
        await queryRunner.query(`ALTER TABLE \`tagset_template\` DROP FOREIGN KEY \`FK_96f23f044acf305c1699e0319d2\``);
        await queryRunner.query(`DROP INDEX \`REL_950221e932175dc7cf7c006488\` ON \`account\``);
        await queryRunner.query(`DROP INDEX \`REL_8af8122897b05315e7eb892525\` ON \`innovation_pack\``);
        await queryRunner.query(`DROP INDEX \`REL_6b1efee39d076d9f7ecb8fef4c\` ON \`space\``);
        await queryRunner.query(`DROP INDEX \`REL_43559aeadc1a5169d17e81b3d4\` ON \`space\``);
        await queryRunner.query(`DROP INDEX \`REL_980c4643d7d9de1b97bc39f518\` ON \`space\``);
        await queryRunner.query(`DROP INDEX \`REL_9c664d684f987a735678b0ba82\` ON \`space\``);
        await queryRunner.query(`DROP INDEX \`REL_68fa2c2b00cc1ed77e7c225e8b\` ON \`space\``);
        await queryRunner.query(`DROP INDEX \`REL_cc0b08eb9679d3daa95153c2af\` ON \`space\``);
        await queryRunner.query(`DROP INDEX \`REL_ea06eb8894469a0f262d929bf0\` ON \`space\``);
        await queryRunner.query(`DROP INDEX \`REL_b4250035291aac1329d59224a9\` ON \`space\``);
        await queryRunner.query(`DROP INDEX \`REL_8d03fd2c8e8411ec9192c79cd9\` ON \`space\``);
        await queryRunner.query(`DROP INDEX \`REL_592a23e68922853bae6ebecd85\` ON \`space_defaults\``);
        await queryRunner.query(`DROP INDEX \`REL_eb0176ef4b98c143322aa6f809\` ON \`templates_set\``);
        await queryRunner.query(`DROP INDEX \`REL_29ff764dc6de1a9dc289cbfb01\` ON \`callout_template\``);
        await queryRunner.query(`DROP INDEX \`REL_479f799f0d86e43c9d8623e827\` ON \`callout_template\``);
        await queryRunner.query(`DROP INDEX \`REL_bd591d7403dabe091f6a116975\` ON \`innovation_flow_template\``);
        await queryRunner.query(`DROP INDEX \`REL_3aec561629db1d65a9b2b3a788\` ON \`innovation_flow_template\``);
        await queryRunner.query(`DROP INDEX \`REL_5b4948db27c348e65055187d5e\` ON \`whiteboard_template\``);
        await queryRunner.query(`DROP INDEX \`REL_cc2faf30ce52648db9299d7072\` ON \`whiteboard_template\``);
        await queryRunner.query(`DROP INDEX \`REL_4a9c8cefc6c7e33aa728d22a90\` ON \`post_template\``);
        await queryRunner.query(`DROP INDEX \`REL_c3bdb693adb031b6613edcef4f\` ON \`post_template\``);
        await queryRunner.query(`DROP INDEX \`REL_3823de95920943655430125fa9\` ON \`community\``);
        await queryRunner.query(`DROP INDEX \`REL_c7d74dd6b92d4202c705cd3676\` ON \`community\``);
        await queryRunner.query(`DROP INDEX \`REL_7fbe50fa78a37776ad962cb764\` ON \`community\``);
        await queryRunner.query(`DROP INDEX \`REL_c0448d2c992a62c9c11bd0f142\` ON \`platform_invitation\``);
        await queryRunner.query(`DROP INDEX \`REL_425bbb4b951f7f4629710763fc\` ON \`platform\``);
        await queryRunner.query(`DROP INDEX \`REL_9f621c51dd854634d8766a9cfa\` ON \`platform\``);
        await queryRunner.query(`DROP INDEX \`REL_5337074c9b818bb63e6f314c80\` ON \`discussion\``);
        await queryRunner.query(`DROP INDEX \`REL_2d8a3ca181c3f0346817685d21\` ON \`discussion\``);
        await queryRunner.query(`DROP INDEX \`REL_a5dae5a376dd49c7c076893d40\` ON \`licensing\``);
        await queryRunner.query(`DROP INDEX \`REL_0c6a4d0a6c13a3f5df6ac01509\` ON \`licensing\``);
        await queryRunner.query(`DROP INDEX \`REL_3879db652f2421337691219ace\` ON \`library\``);
        await queryRunner.query(`DROP INDEX \`REL_b0c80ccf319a1c7a7af12b3998\` ON \`invitation\``);
        await queryRunner.query(`DROP INDEX \`REL_b132226941570cb650a4023d49\` ON \`invitation\``);
        await queryRunner.query(`DROP INDEX \`REL_eb99e588873c788a68a035478a\` ON \`communication\``);
        await queryRunner.query(`DROP INDEX \`REL_10458c50c10436b6d589b40e5c\` ON \`user\``);
        await queryRunner.query(`DROP INDEX \`REL_028322b763dc94242dc9f638f9\` ON \`user\``);
        await queryRunner.query(`DROP INDEX \`REL_395aa74996a1f978b4969d114b\` ON \`organization\``);
        await queryRunner.query(`DROP INDEX \`REL_58fd47c4a6ac8df9fe2bcaed87\` ON \`organization\``);
        await queryRunner.query(`DROP INDEX \`REL_5a72d5b37312bac2e0a0115718\` ON \`organization\``);
        await queryRunner.query(`DROP INDEX \`REL_7f1bec8979b57ed7ebd392a2ca\` ON \`organization\``);
        await queryRunner.query(`DROP INDEX \`REL_d2cb77c14644156ec8e865608e\` ON \`organization\``);
        await queryRunner.query(`DROP INDEX \`REL_e0e150e4f11d906b931b46a2d8\` ON \`organization\``);
        await queryRunner.query(`DROP INDEX \`REL_8e76dcf171c45875c44febb1d8\` ON \`preference_set\``);
        await queryRunner.query(`DROP INDEX \`REL_b4cf0f96bf08cf396f68355522\` ON \`preference\``);
        await queryRunner.query(`DROP INDEX \`REL_1cc3b275fc2a9d9d9b0ae33b31\` ON \`organization_verification\``);
        await queryRunner.query(`DROP INDEX \`REL_c66eddab0caacb1ef8d46bcafd\` ON \`organization_verification\``);
        await queryRunner.query(`DROP INDEX \`REL_35c6b1de6d4d89dfe8e9c85d77\` ON \`collaboration\``);
        await queryRunner.query(`DROP INDEX \`REL_f67a2d25c945269d602c182fbc\` ON \`collaboration\``);
        await queryRunner.query(`DROP INDEX \`REL_b7ece56376ac7ca0b9a56c33b3\` ON \`collaboration\``);
        await queryRunner.query(`DROP INDEX \`REL_96a8cbe1706f459fd7d883be9b\` ON \`innovation_flow\``);
        await queryRunner.query(`DROP INDEX \`REL_a6e050daa4c7a3ab1e411c3651\` ON \`innovation_flow\``);
        await queryRunner.query(`DROP INDEX \`REL_56aae15a664b2889a1a11c2cf8\` ON \`timeline\``);
        await queryRunner.query(`DROP INDEX \`REL_5fe58ece01b48496aebc04733d\` ON \`timeline\``);
        await queryRunner.query(`DROP INDEX \`REL_6e74d59afda096b68d12a69969\` ON \`calendar\``);
        await queryRunner.query(`DROP INDEX \`REL_b5069b11030e9608ee4468f850\` ON \`calendar_event\``);
        await queryRunner.query(`DROP INDEX \`REL_9349e137959f3ca5818c2e62b3\` ON \`calendar_event\``);
        await queryRunner.query(`DROP INDEX \`REL_8ee86afa2808a4ab523b9ee6c5\` ON \`calendar_event\``);
        await queryRunner.query(`DROP INDEX \`REL_62ed316cda7b75735b20307b47\` ON \`callout\``);
        await queryRunner.query(`DROP INDEX \`REL_36b0da55acff774d0845aeb55f\` ON \`callout\``);
        await queryRunner.query(`DROP INDEX \`REL_1e740008a7e1512966e3b08414\` ON \`callout\``);
        await queryRunner.query(`DROP INDEX \`REL_cf776244b01436d8ca5cc76284\` ON \`callout\``);
        await queryRunner.query(`DROP INDEX \`REL_042b9825d770d6b3009ae206c2\` ON \`post\``);
        await queryRunner.query(`DROP INDEX \`REL_970844fcd10c2b6df7c1b49eac\` ON \`post\``);
        await queryRunner.query(`DROP INDEX \`REL_390343b22abec869bf80041933\` ON \`post\``);
        await queryRunner.query(`DROP INDEX \`REL_3f9e9e2798d2a4d84b16ee8477\` ON \`whiteboard\``);
        await queryRunner.query(`DROP INDEX \`REL_d3b86160bb7d704212382b0ca4\` ON \`whiteboard\``);
        await queryRunner.query(`DROP INDEX \`REL_d1d94dd8e0c417b4188a05ccbc\` ON \`room\``);
        await queryRunner.query(`DROP INDEX \`REL_432056041df0e4337b17ff7b09\` ON \`profile\``);
        await queryRunner.query(`DROP INDEX \`REL_f2f48b57269987b13b415a0058\` ON \`storage_bucket\``);
        await queryRunner.query(`DROP INDEX \`REL_9fb9257b14ec21daf5bc9aa4c8\` ON \`document\``);
        await queryRunner.query(`DROP INDEX \`REL_d9e2dfcccf59233c17cc6bc641\` ON \`document\``);
        await queryRunner.query(`DROP INDEX \`REL_4fbd109f9bb84f58b7a3c60649\` ON \`visual\``);
        await queryRunner.query(`ALTER TABLE \`ai_persona_service\` DROP COLUMN \`bodyOfKnowledgeID\``);
        await queryRunner.query(`ALTER TABLE \`ai_persona_service\` ADD \`bodyOfKnowledgeID\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`ai_persona_service\` DROP COLUMN \`bodyOfKnowledgeType\``);
        await queryRunner.query(`ALTER TABLE \`ai_persona_service\` ADD \`bodyOfKnowledgeType\` varchar(64) NULL`);
        await queryRunner.query(`ALTER TABLE \`ai_persona_service\` DROP COLUMN \`dataAccessMode\``);
        await queryRunner.query(`ALTER TABLE \`ai_persona_service\` ADD \`dataAccessMode\` varchar(64) NOT NULL DEFAULT 'space_profile'`);
        await queryRunner.query(`ALTER TABLE \`activity\` DROP COLUMN \`type\``);
        await queryRunner.query(`ALTER TABLE \`activity\` ADD \`type\` varchar(128) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`activity\` DROP COLUMN \`description\``);
        await queryRunner.query(`ALTER TABLE \`activity\` ADD \`description\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`activity\` CHANGE \`visibility\` \`visibility\` tinyint(1) NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE \`activity\` CHANGE \`collaborationID\` \`collaborationID\` char(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`activity\` CHANGE \`resourceID\` \`resourceID\` char(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`activity\` CHANGE \`triggeredBy\` \`triggeredBy\` char(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`activity\` DROP INDEX \`IDX_07a39cea9426b689be25fd61de\``);
        await queryRunner.query(`ALTER TABLE \`innovation_hub\` DROP COLUMN \`accountId\``);
        await queryRunner.query(`ALTER TABLE \`innovation_hub\` ADD \`accountId\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`innovation_hub\` DROP COLUMN \`searchVisibility\``);
        await queryRunner.query(`ALTER TABLE \`innovation_hub\` ADD \`searchVisibility\` varchar(36) NOT NULL DEFAULT 'account'`);
        await queryRunner.query(`ALTER TABLE \`innovation_hub\` CHANGE \`listedInStore\` \`listedInStore\` tinyint NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE \`innovation_hub\` DROP INDEX \`IDX_8f35d04d098bb6c7c57a9a83ac\``);
        await queryRunner.query(`ALTER TABLE \`innovation_hub\` DROP COLUMN \`subdomain\``);
        await queryRunner.query(`ALTER TABLE \`innovation_hub\` ADD \`subdomain\` varchar(255) NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_8f35d04d098bb6c7c57a9a83ac\` ON \`innovation_hub\` (\`subdomain\`)`);
        await queryRunner.query(`ALTER TABLE \`innovation_hub\` DROP INDEX \`IDX_1d39dac2c6d2f17286d90c306b\``);
        await queryRunner.query(`ALTER TABLE \`innovation_hub\` DROP COLUMN \`nameID\``);
        await queryRunner.query(`ALTER TABLE \`innovation_hub\` ADD \`nameID\` varchar(255) NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_1d39dac2c6d2f17286d90c306b\` ON \`innovation_hub\` (\`nameID\`)`);
        await queryRunner.query(`ALTER TABLE \`account\` DROP INDEX \`IDX_950221e932175dc7cf7c006488\``);
        await queryRunner.query(`ALTER TABLE \`innovation_pack\` DROP INDEX \`IDX_8af8122897b05315e7eb892525\``);
        await queryRunner.query(`ALTER TABLE \`innovation_pack\` DROP COLUMN \`nameID\``);
        await queryRunner.query(`ALTER TABLE \`innovation_pack\` ADD \`nameID\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`virtual_contributor\` CHANGE \`accountId\` \`accountId\` char(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`virtual_contributor\` DROP COLUMN \`searchVisibility\``);
        await queryRunner.query(`ALTER TABLE \`virtual_contributor\` ADD \`searchVisibility\` varchar(36) NOT NULL DEFAULT 'account'`);
        await queryRunner.query(`ALTER TABLE \`virtual_contributor\` DROP COLUMN \`nameID\``);
        await queryRunner.query(`ALTER TABLE \`virtual_contributor\` ADD \`nameID\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_7a962c9b04b0d197bc3c93262a7\` FOREIGN KEY (\`accountId\`) REFERENCES \`account\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`ai_persona\` CHANGE \`interactionModes\` \`interactionModes\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`ai_persona\` DROP COLUMN \`dataAccessMode\``);
        await queryRunner.query(`ALTER TABLE \`ai_persona\` ADD \`dataAccessMode\` varchar(64) NULL`);
        await queryRunner.query(`ALTER TABLE \`space\` DROP INDEX \`IDX_6b1efee39d076d9f7ecb8fef4c\``);
        await queryRunner.query(`ALTER TABLE \`space\` DROP INDEX \`IDX_43559aeadc1a5169d17e81b3d4\``);
        await queryRunner.query(`ALTER TABLE \`space\` DROP INDEX \`IDX_980c4643d7d9de1b97bc39f518\``);
        await queryRunner.query(`ALTER TABLE \`space\` DROP INDEX \`IDX_9c664d684f987a735678b0ba82\``);
        await queryRunner.query(`ALTER TABLE \`space\` DROP INDEX \`IDX_68fa2c2b00cc1ed77e7c225e8b\``);
        await queryRunner.query(`ALTER TABLE \`space\` DROP INDEX \`IDX_cc0b08eb9679d3daa95153c2af\``);
        await queryRunner.query(`ALTER TABLE \`space\` DROP INDEX \`IDX_ea06eb8894469a0f262d929bf0\``);
        await queryRunner.query(`ALTER TABLE \`space\` DROP INDEX \`IDX_b4250035291aac1329d59224a9\``);
        await queryRunner.query(`ALTER TABLE \`space\` DROP INDEX \`IDX_8d03fd2c8e8411ec9192c79cd9\``);
        await queryRunner.query(`ALTER TABLE \`space\` DROP COLUMN \`visibility\``);
        await queryRunner.query(`ALTER TABLE \`space\` ADD \`visibility\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`space\` DROP COLUMN \`levelZeroSpaceID\``);
        await queryRunner.query(`ALTER TABLE \`space\` ADD \`levelZeroSpaceID\` char(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`space\` DROP COLUMN \`type\``);
        await queryRunner.query(`ALTER TABLE \`space\` ADD \`type\` varchar(32) NOT NULL DEFAULT '_utf8mb4\'space\''`);
        await queryRunner.query(`ALTER TABLE \`space\` DROP COLUMN \`nameID\``);
        await queryRunner.query(`ALTER TABLE \`space\` ADD \`nameID\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`space_defaults\` DROP INDEX \`IDX_592a23e68922853bae6ebecd85\``);
        await queryRunner.query(`ALTER TABLE \`templates_set\` DROP INDEX \`IDX_eb0176ef4b98c143322aa6f809\``);
        await queryRunner.query(`ALTER TABLE \`callout_template\` DROP INDEX \`IDX_29ff764dc6de1a9dc289cbfb01\``);
        await queryRunner.query(`ALTER TABLE \`callout_template\` DROP INDEX \`IDX_479f799f0d86e43c9d8623e827\``);
        await queryRunner.query(`ALTER TABLE \`innovation_flow_template\` DROP INDEX \`IDX_bd591d7403dabe091f6a116975\``);
        await queryRunner.query(`ALTER TABLE \`innovation_flow_template\` DROP INDEX \`IDX_3aec561629db1d65a9b2b3a788\``);
        await queryRunner.query(`ALTER TABLE \`innovation_flow_template\` CHANGE \`states\` \`states\` text NOT NULL DEFAULT '_utf8mb4\'[]\''`);
        await queryRunner.query(`ALTER TABLE \`whiteboard_template\` DROP INDEX \`IDX_5b4948db27c348e65055187d5e\``);
        await queryRunner.query(`ALTER TABLE \`whiteboard_template\` DROP INDEX \`IDX_cc2faf30ce52648db9299d7072\``);
        await queryRunner.query(`ALTER TABLE \`post_template\` DROP INDEX \`IDX_4a9c8cefc6c7e33aa728d22a90\``);
        await queryRunner.query(`ALTER TABLE \`post_template\` DROP INDEX \`IDX_c3bdb693adb031b6613edcef4f\``);
        await queryRunner.query(`ALTER TABLE \`community\` DROP INDEX \`IDX_3823de95920943655430125fa9\``);
        await queryRunner.query(`ALTER TABLE \`community\` DROP INDEX \`IDX_c7d74dd6b92d4202c705cd3676\``);
        await queryRunner.query(`ALTER TABLE \`community\` DROP INDEX \`IDX_7fbe50fa78a37776ad962cb764\``);
        await queryRunner.query(`ALTER TABLE \`community\` ADD CONSTRAINT \`FK_7fbe50fa78a37776ad962cb7643\` FOREIGN KEY (\`communicationId\`) REFERENCES \`communication\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`platform_invitation\` DROP INDEX \`IDX_c0448d2c992a62c9c11bd0f142\``);
        await queryRunner.query(`ALTER TABLE \`platform_invitation\` CHANGE \`createdBy\` \`createdBy\` char(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`platform_invitation\` DROP COLUMN \`lastName\``);
        await queryRunner.query(`ALTER TABLE \`platform_invitation\` ADD \`lastName\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`platform_invitation\` DROP COLUMN \`firstName\``);
        await queryRunner.query(`ALTER TABLE \`platform_invitation\` ADD \`firstName\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`platform_invitation\` DROP COLUMN \`email\``);
        await queryRunner.query(`ALTER TABLE \`platform_invitation\` ADD \`email\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`platform_invitation\` DROP COLUMN \`platformRole\``);
        await queryRunner.query(`ALTER TABLE \`platform_invitation\` ADD \`platformRole\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`platform\` DROP INDEX \`IDX_425bbb4b951f7f4629710763fc\``);
        await queryRunner.query(`ALTER TABLE \`platform\` DROP INDEX \`IDX_9f621c51dd854634d8766a9cfa\``);
        await queryRunner.query(`ALTER TABLE \`discussion\` DROP INDEX \`IDX_5337074c9b818bb63e6f314c80\``);
        await queryRunner.query(`ALTER TABLE \`discussion\` DROP INDEX \`IDX_2d8a3ca181c3f0346817685d21\``);
        await queryRunner.query(`ALTER TABLE \`discussion\` CHANGE \`createdBy\` \`createdBy\` char(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`discussion\` DROP COLUMN \`nameID\``);
        await queryRunner.query(`ALTER TABLE \`discussion\` ADD \`nameID\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_2d8a3ca181c3f0346817685d21d\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`licensing\` DROP INDEX \`IDX_a5dae5a376dd49c7c076893d40\``);
        await queryRunner.query(`ALTER TABLE \`licensing\` DROP INDEX \`IDX_0c6a4d0a6c13a3f5df6ac01509\``);
        await queryRunner.query(`ALTER TABLE \`license_plan\` DROP COLUMN \`type\``);
        await queryRunner.query(`ALTER TABLE \`license_plan\` ADD \`type\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`license_plan\` DROP COLUMN \`licenseCredential\``);
        await queryRunner.query(`ALTER TABLE \`license_plan\` ADD \`licenseCredential\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`license_plan\` CHANGE \`sortOrder\` \`sortOrder\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`library\` DROP INDEX \`IDX_3879db652f2421337691219ace\``);
        await queryRunner.query(`ALTER TABLE \`invitation\` DROP COLUMN \`communityId\``);
        await queryRunner.query(`ALTER TABLE \`invitation\` ADD \`communityId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`invitation\` DROP INDEX \`IDX_b0c80ccf319a1c7a7af12b3998\``);
        await queryRunner.query(`ALTER TABLE \`invitation\` DROP COLUMN \`lifecycleId\``);
        await queryRunner.query(`ALTER TABLE \`invitation\` ADD \`lifecycleId\` varchar(36) NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_b0c80ccf319a1c7a7af12b3998\` ON \`invitation\` (\`lifecycleId\`)`);
        await queryRunner.query(`ALTER TABLE \`invitation\` DROP INDEX \`IDX_b132226941570cb650a4023d49\``);
        await queryRunner.query(`ALTER TABLE \`invitation\` DROP COLUMN \`authorizationId\``);
        await queryRunner.query(`ALTER TABLE \`invitation\` ADD \`authorizationId\` varchar(36) NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_b132226941570cb650a4023d49\` ON \`invitation\` (\`authorizationId\`)`);
        await queryRunner.query(`ALTER TABLE \`invitation\` DROP COLUMN \`contributorType\``);
        await queryRunner.query(`ALTER TABLE \`invitation\` ADD \`contributorType\` char(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`invitation\` CHANGE \`createdBy\` \`createdBy\` char(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`invitation\` CHANGE \`invitedContributor\` \`invitedContributor\` char(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`invitation\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`invitation\` ADD \`id\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`invitation\` ADD PRIMARY KEY (\`id\`)`);
        await queryRunner.query(`ALTER TABLE \`invitation\` ADD CONSTRAINT \`FK_b0c80ccf319a1c7a7af12b39987\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`invitation\` ADD CONSTRAINT \`FK_b132226941570cb650a4023d493\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`form\` CHANGE \`description\` \`description\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`form\` CHANGE \`questions\` \`questions\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`community_policy\` CHANGE \`admin\` \`admin\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`community_policy\` CHANGE \`lead\` \`lead\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`community_policy\` CHANGE \`member\` \`member\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`communication\` DROP INDEX \`IDX_eb99e588873c788a68a035478a\``);
        await queryRunner.query(`ALTER TABLE \`communication\` DROP COLUMN \`spaceID\``);
        await queryRunner.query(`ALTER TABLE \`communication\` ADD \`spaceID\` char(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` DROP INDEX \`IDX_10458c50c10436b6d589b40e5c\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP INDEX \`IDX_028322b763dc94242dc9f638f9\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`phone\``);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`phone\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`email\``);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`email\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`lastName\``);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`lastName\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`firstName\``);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`firstName\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`accountUpn\``);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`accountUpn\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` CHANGE \`accountID\` \`accountID\` char(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`nameID\``);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`nameID\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`nvp\` DROP COLUMN \`value\``);
        await queryRunner.query(`ALTER TABLE \`nvp\` ADD \`value\` varchar(512) NULL`);
        await queryRunner.query(`ALTER TABLE \`organization\` DROP INDEX \`IDX_395aa74996a1f978b4969d114b\``);
        await queryRunner.query(`ALTER TABLE \`organization\` DROP INDEX \`IDX_58fd47c4a6ac8df9fe2bcaed87\``);
        await queryRunner.query(`ALTER TABLE \`organization\` DROP INDEX \`IDX_5a72d5b37312bac2e0a0115718\``);
        await queryRunner.query(`ALTER TABLE \`organization\` DROP INDEX \`IDX_7f1bec8979b57ed7ebd392a2ca\``);
        await queryRunner.query(`ALTER TABLE \`organization\` DROP INDEX \`IDX_d2cb77c14644156ec8e865608e\``);
        await queryRunner.query(`ALTER TABLE \`organization\` DROP INDEX \`IDX_e0e150e4f11d906b931b46a2d8\``);
        await queryRunner.query(`ALTER TABLE \`organization\` CHANGE \`accountID\` \`accountID\` char(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`organization\` DROP COLUMN \`nameID\``);
        await queryRunner.query(`ALTER TABLE \`organization\` ADD \`nameID\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`agent\` CHANGE \`type\` \`type\` varchar(128) NULL`);
        await queryRunner.query(`ALTER TABLE \`credential\` DROP COLUMN \`resourceID\``);
        await queryRunner.query(`ALTER TABLE \`credential\` ADD \`resourceID\` char(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`preference_set\` DROP INDEX \`IDX_8e76dcf171c45875c44febb1d8\``);
        await queryRunner.query(`ALTER TABLE \`preference\` DROP INDEX \`IDX_b4cf0f96bf08cf396f68355522\``);
        await queryRunner.query(`ALTER TABLE \`organization_verification\` DROP INDEX \`IDX_1cc3b275fc2a9d9d9b0ae33b31\``);
        await queryRunner.query(`ALTER TABLE \`organization_verification\` DROP INDEX \`IDX_c66eddab0caacb1ef8d46bcafd\``);
        await queryRunner.query(`ALTER TABLE \`organization_verification\` DROP COLUMN \`organizationID\``);
        await queryRunner.query(`ALTER TABLE \`organization_verification\` ADD \`organizationID\` char(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`collaboration\` DROP INDEX \`IDX_35c6b1de6d4d89dfe8e9c85d77\``);
        await queryRunner.query(`ALTER TABLE \`collaboration\` DROP INDEX \`IDX_f67a2d25c945269d602c182fbc\``);
        await queryRunner.query(`ALTER TABLE \`collaboration\` DROP INDEX \`IDX_b7ece56376ac7ca0b9a56c33b3\``);
        await queryRunner.query(`ALTER TABLE \`collaboration\` CHANGE \`groupsStr\` \`groupsStr\` text NOT NULL DEFAULT '_utf8mb4\'[]\''`);
        await queryRunner.query(`ALTER TABLE \`innovation_flow\` DROP INDEX \`IDX_96a8cbe1706f459fd7d883be9b\``);
        await queryRunner.query(`ALTER TABLE \`innovation_flow\` DROP INDEX \`IDX_a6e050daa4c7a3ab1e411c3651\``);
        await queryRunner.query(`ALTER TABLE \`innovation_flow\` CHANGE \`states\` \`states\` text NOT NULL DEFAULT '_utf8mb4\'[]\''`);
        await queryRunner.query(`ALTER TABLE \`timeline\` DROP INDEX \`IDX_56aae15a664b2889a1a11c2cf8\``);
        await queryRunner.query(`ALTER TABLE \`timeline\` DROP INDEX \`IDX_5fe58ece01b48496aebc04733d\``);
        await queryRunner.query(`ALTER TABLE \`calendar\` DROP INDEX \`IDX_6e74d59afda096b68d12a69969\``);
        await queryRunner.query(`ALTER TABLE \`calendar_event\` DROP INDEX \`IDX_b5069b11030e9608ee4468f850\``);
        await queryRunner.query(`ALTER TABLE \`calendar_event\` DROP INDEX \`IDX_9349e137959f3ca5818c2e62b3\``);
        await queryRunner.query(`ALTER TABLE \`calendar_event\` DROP INDEX \`IDX_8ee86afa2808a4ab523b9ee6c5\``);
        await queryRunner.query(`ALTER TABLE \`calendar_event\` CHANGE \`durationMinutes\` \`durationMinutes\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`calendar_event\` CHANGE \`multipleDays\` \`multipleDays\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`calendar_event\` CHANGE \`wholeDay\` \`wholeDay\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`calendar_event\` CHANGE \`startDate\` \`startDate\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`calendar_event\` CHANGE \`createdBy\` \`createdBy\` char(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`calendar_event\` DROP COLUMN \`type\``);
        await queryRunner.query(`ALTER TABLE \`calendar_event\` ADD \`type\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`calendar_event\` DROP COLUMN \`nameID\``);
        await queryRunner.query(`ALTER TABLE \`calendar_event\` ADD \`nameID\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`callout\` DROP INDEX \`IDX_62ed316cda7b75735b20307b47\``);
        await queryRunner.query(`ALTER TABLE \`callout\` DROP INDEX \`IDX_36b0da55acff774d0845aeb55f\``);
        await queryRunner.query(`ALTER TABLE \`callout\` DROP INDEX \`IDX_1e740008a7e1512966e3b08414\``);
        await queryRunner.query(`ALTER TABLE \`callout\` DROP INDEX \`IDX_cf776244b01436d8ca5cc76284\``);
        await queryRunner.query(`ALTER TABLE \`callout\` CHANGE \`publishedDate\` \`publishedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`callout\` DROP COLUMN \`visibility\``);
        await queryRunner.query(`ALTER TABLE \`callout\` ADD \`visibility\` text NOT NULL DEFAULT '_utf8mb4\'draft\''`);
        await queryRunner.query(`ALTER TABLE \`callout\` DROP COLUMN \`nameID\``);
        await queryRunner.query(`ALTER TABLE \`callout\` ADD \`nameID\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_62ed316cda7b75735b20307b47e\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_36b0da55acff774d0845aeb55f2\` FOREIGN KEY (\`contributionDefaultsId\`) REFERENCES \`callout_contribution_defaults\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_1e740008a7e1512966e3b084148\` FOREIGN KEY (\`contributionPolicyId\`) REFERENCES \`callout_contribution_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_cf776244b01436d8ca5cc762848\` FOREIGN KEY (\`framingId\`) REFERENCES \`callout_framing\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`callout_contribution\` CHANGE \`createdBy\` \`createdBy\` char(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`post\` DROP INDEX \`IDX_042b9825d770d6b3009ae206c2\``);
        await queryRunner.query(`ALTER TABLE \`post\` DROP INDEX \`IDX_970844fcd10c2b6df7c1b49eac\``);
        await queryRunner.query(`ALTER TABLE \`post\` DROP INDEX \`IDX_390343b22abec869bf80041933\``);
        await queryRunner.query(`ALTER TABLE \`post\` CHANGE \`createdBy\` \`createdBy\` char(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`post\` DROP COLUMN \`type\``);
        await queryRunner.query(`ALTER TABLE \`post\` ADD \`type\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`post\` DROP COLUMN \`nameID\``);
        await queryRunner.query(`ALTER TABLE \`post\` ADD \`nameID\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`callout_contribution_policy\` DROP COLUMN \`state\``);
        await queryRunner.query(`ALTER TABLE \`callout_contribution_policy\` ADD \`state\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`whiteboard\` DROP INDEX \`IDX_3f9e9e2798d2a4d84b16ee8477\``);
        await queryRunner.query(`ALTER TABLE \`whiteboard\` DROP INDEX \`IDX_d3b86160bb7d704212382b0ca4\``);
        await queryRunner.query(`ALTER TABLE \`whiteboard\` DROP COLUMN \`contentUpdatePolicy\``);
        await queryRunner.query(`ALTER TABLE \`whiteboard\` ADD \`contentUpdatePolicy\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`whiteboard\` DROP COLUMN \`nameID\``);
        await queryRunner.query(`ALTER TABLE \`whiteboard\` ADD \`nameID\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`room\` DROP INDEX \`IDX_d1d94dd8e0c417b4188a05ccbc\``);
        await queryRunner.query(`ALTER TABLE \`room\` DROP COLUMN \`type\``);
        await queryRunner.query(`ALTER TABLE \`room\` ADD \`type\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`vc_interaction\` DROP COLUMN \`threadID\``);
        await queryRunner.query(`ALTER TABLE \`vc_interaction\` ADD \`threadID\` varchar(128) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`profile\` DROP INDEX \`IDX_432056041df0e4337b17ff7b09\``);
        await queryRunner.query(`ALTER TABLE \`profile\` DROP COLUMN \`type\``);
        await queryRunner.query(`ALTER TABLE \`profile\` ADD \`type\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`profile\` DROP COLUMN \`tagline\``);
        await queryRunner.query(`ALTER TABLE \`profile\` ADD \`tagline\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`storage_bucket\` DROP INDEX \`IDX_f2f48b57269987b13b415a0058\``);
        await queryRunner.query(`ALTER TABLE \`storage_bucket\` CHANGE \`maxFileSize\` \`maxFileSize\` int NULL DEFAULT '5242880'`);
        await queryRunner.query(`ALTER TABLE \`storage_bucket\` CHANGE \`allowedMimeTypes\` \`allowedMimeTypes\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`document\` DROP INDEX \`IDX_9fb9257b14ec21daf5bc9aa4c8\``);
        await queryRunner.query(`ALTER TABLE \`document\` DROP INDEX \`IDX_d9e2dfcccf59233c17cc6bc641\``);
        await queryRunner.query(`ALTER TABLE \`document\` CHANGE \`externalID\` \`externalID\` varchar(128) NULL`);
        await queryRunner.query(`ALTER TABLE \`document\` CHANGE \`size\` \`size\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`document\` CHANGE \`mimeType\` \`mimeType\` varchar(128) NULL`);
        await queryRunner.query(`ALTER TABLE \`document\` DROP COLUMN \`displayName\``);
        await queryRunner.query(`ALTER TABLE \`document\` ADD \`displayName\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`document\` CHANGE \`createdBy\` \`createdBy\` char(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`location\` CHANGE \`postalCode\` \`postalCode\` varchar(128) NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE \`location\` CHANGE \`stateOrProvince\` \`stateOrProvince\` varchar(128) NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE \`location\` DROP COLUMN \`addressLine2\``);
        await queryRunner.query(`ALTER TABLE \`location\` ADD \`addressLine2\` varchar(128) NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE \`location\` DROP COLUMN \`addressLine1\``);
        await queryRunner.query(`ALTER TABLE \`location\` ADD \`addressLine1\` varchar(128) NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE \`location\` DROP COLUMN \`country\``);
        await queryRunner.query(`ALTER TABLE \`location\` ADD \`country\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`location\` DROP COLUMN \`city\``);
        await queryRunner.query(`ALTER TABLE \`location\` ADD \`city\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`visual\` DROP INDEX \`IDX_4fbd109f9bb84f58b7a3c60649\``);
        await queryRunner.query(`ALTER TABLE \`visual\` DROP COLUMN \`aspectRatio\``);
        await queryRunner.query(`ALTER TABLE \`visual\` ADD \`aspectRatio\` float(12) NULL`);
        await queryRunner.query(`ALTER TABLE \`visual\` DROP COLUMN \`uri\``);
        await queryRunner.query(`ALTER TABLE \`visual\` ADD \`uri\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`tagset\` DROP COLUMN \`type\``);
        await queryRunner.query(`ALTER TABLE \`tagset\` ADD \`type\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`tagset_template\` CHANGE \`allowedValues\` \`allowedValues\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`tagset_template\` DROP COLUMN \`type\``);
        await queryRunner.query(`ALTER TABLE \`tagset_template\` ADD \`type\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`tagset_template\` DROP COLUMN \`name\``);
        await queryRunner.query(`ALTER TABLE \`tagset_template\` ADD \`name\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`licensing\` ADD \`basePlanId\` char(36) NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_0f03c61020ea0dfa0198c60304\` ON \`activity\` (\`rowId\`)`);
        await queryRunner.query(`CREATE INDEX \`REL_156fd30246eb151b9d17716abf\` ON \`innovation_hub\` (\`accountId\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_156fd30246eb151b9d17716abf\` ON \`innovation_hub\` (\`accountId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_833582df0c439ab8c9adc5240d\` ON \`account\` (\`agentId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_99998853c1ee793f61bda7eff79\` ON \`account\` (\`storageAggregatorId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_22222ccdda9ba57d8e3a634cd8\` ON \`innovation_pack\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_77777450cf75dc486700ca034c6\` ON \`innovation_pack\` (\`accountId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_e2eaa2213ac4454039cd8abc07\` ON \`virtual_contributor\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_a8890dcd65b8c3ee6e160d33f3\` ON \`virtual_contributor\` (\`agentId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_55b8101bdf4f566645e928c26e\` ON \`virtual_contributor\` (\`aiPersonaId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_4504c37764f6962ccbd165a21d\` ON \`virtual_contributor\` (\`profileId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_f5ad15bcb06a95c2a109fbcce2\` ON \`space\` (\`communityId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_b0c3f360534db92017e36a00bb\` ON \`space\` (\`agentId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_6db8627abbf00b1b986e359054\` ON \`space\` (\`contextId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_17a161eef37c9f07186532ab75\` ON \`space\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_ea06eb8894469a0f262d929bf0\` ON \`space\` (\`collaborationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_cc0b08eb9679d3daa95153c2af\` ON \`space\` (\`contextId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_b4250035291aac1329d59224a9\` ON \`space\` (\`profileId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_9c664d684f987a735678b0ba82\` ON \`space\` (\`agentId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_980c4643d7d9de1b97bc39f518\` ON \`space\` (\`storageAggregatorId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_8d03fd2c8e8411ec9192c79cd9\` ON \`space\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_6b1efee39d076d9f7ecb8fef4c\` ON \`space\` (\`defaultsId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_68fa2c2b00cc1ed77e7c225e8b\` ON \`space\` (\`communityId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_6325f4ef25c4e07e723a96ed37\` ON \`space\` (\`collaborationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_43559aeadc1a5169d17e81b3d4\` ON \`space\` (\`libraryId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_71231450cf75dc486700ca034c6\` ON \`space\` (\`profileId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_1114d59c0b805c9c1ecb0070e16\` ON \`space\` (\`storageAggregatorId\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_666ba75964e5a534e4bfa54846\` ON \`space_defaults\` (\`innovationFlowTemplateId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_413ba75964e5a534e4bfa54846\` ON \`space_defaults\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_66666ccdda9ba57d8e3a634cd8\` ON \`templates_set\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_eb0176ef4b98c143322aa6f809\` ON \`templates_set\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_bffd07760b73be1aad13b6d00c\` ON \`callout_template\` (\`contributionPolicyId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_83bbc10ba2ddee4502bf327f1f\` ON \`callout_template\` (\`contributionDefaultsId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_479f799f0d86e43c9d8623e827\` ON \`callout_template\` (\`contributionDefaultsId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_29ff764dc6de1a9dc289cbfb01\` ON \`callout_template\` (\`contributionPolicyId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_76542ccdda9ba57d8e3a634cd8\` ON \`innovation_flow_template\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_bd591d7403dabe091f6a116975\` ON \`innovation_flow_template\` (\`profileId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_3aec561629db1d65a9b2b3a788\` ON \`innovation_flow_template\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_76546450cf75dc486700ca034c6\` ON \`innovation_flow_template\` (\`templatesSetId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_88888ccdda9ba57d8e3a634cd8\` ON \`whiteboard_template\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_cc2faf30ce52648db9299d7072\` ON \`whiteboard_template\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_5b4948db27c348e65055187d5e\` ON \`whiteboard_template\` (\`profileId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_69991450cf75dc486700ca034c6\` ON \`whiteboard_template\` (\`profileId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_65556450cf75dc486700ca034c6\` ON \`whiteboard_template\` (\`templatesSetId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_44447ccdda9ba57d8e3a634cd8\` ON \`post_template\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_c3bdb693adb031b6613edcef4f\` ON \`post_template\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_4a9c8cefc6c7e33aa728d22a90\` ON \`post_template\` (\`profileId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_66666450cf75dc486700ca034c6\` ON \`post_template\` (\`templatesSetId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_59991450cf75dc486700ca034c6\` ON \`post_template\` (\`profileId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_c9ff67519d26140f98265a542e\` ON \`community\` (\`policyId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_c7d74dd6b92d4202c705cd3676\` ON \`community\` (\`applicationFormId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_7fbe50fa78a37776ad962cb764\` ON \`community\` (\`communicationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_3823de95920943655430125fa9\` ON \`community\` (\`policyId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_2e7dd2fa8c829352cfbecb2cc9\` ON \`community\` (\`guidelinesId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_42a7abc9f297ffcacb53087da8\` ON \`platform_invitation\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_2a985f774bd4de2a9aead6bd5b1\` ON \`platform_invitation\` (\`communityId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_44333ccdda9ba57d8e3a634cd8\` ON \`platform\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_1282e7fa19848d4b4bc3a4829d\` ON \`platform\` (\`licensingId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_dd88d373c64b04e24705d575c9\` ON \`platform\` (\`forumId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_1282e7fa19848d4b4bc3a4829d\` ON \`platform\` (\`licensingId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_5337074c9b818bb63e6f314c80\` ON \`discussion\` (\`commentsId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_2d8a3ca181c3f0346817685d21\` ON \`discussion\` (\`profileId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_65ca04c85acdd5dad63f557609\` ON \`licensing\` (\`licensePolicyId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_1ddac8984c93ca18a23edb30fc\` ON \`licensing\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_42becb5fd6dc563f51ecb71abcc\` ON \`license_plan\` (\`licensingId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_33333ccdda9ba57d8e3a634cd8\` ON \`library\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_b132226941570cb650a4023d49\` ON \`invitation\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_b0c80ccf319a1c7a7af12b3998\` ON \`invitation\` (\`lifecycleId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_339c1fe2a9c5caef5b982303fb0\` ON \`invitation\` (\`communityId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_eb99e588873c788a68a035478a\` ON \`communication\` (\`updatesId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_88880355b4e9bd6b02c66507aa\` ON \`user\` (\`preferenceSetId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_10458c50c10436b6d589b40e5c\` ON \`user\` (\`storageAggregatorId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_028322b763dc94242dc9f638f9\` ON \`user\` (\`preferenceSetId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_4444d59c0b805c9c1ecb0070e16\` ON \`user\` (\`storageAggregatorId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_2b8381df8c3a1680f50e4bc2351\` ON \`user_group\` (\`organizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_badc07674ce4e44801e5a5f36c\` ON \`organization\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_95bbac07221e98072beafa6173\` ON \`organization\` (\`verificationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_7671a7e33f6665764f4534a596\` ON \`organization\` (\`agentId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_037ba4b170844c039e74aa22ec\` ON \`organization\` (\`profileId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_e0e150e4f11d906b931b46a2d8\` ON \`organization\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_d2cb77c14644156ec8e865608e\` ON \`organization\` (\`profileId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_95bbac07221e98072beafa6173\` ON \`organization\` (\`verificationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_7f1bec8979b57ed7ebd392a2ca\` ON \`organization\` (\`agentId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_5a72d5b37312bac2e0a0115718\` ON \`organization\` (\`verificationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_58fd47c4a6ac8df9fe2bcaed87\` ON \`organization\` (\`preferenceSetId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_395aa74996a1f978b4969d114b\` ON \`organization\` (\`storageAggregatorId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_266bc44a18601f893566962df7\` ON \`organization\` (\`rowId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_3334d59c0b805c9c1ecb0070e16\` ON \`organization\` (\`storageAggregatorId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_8888dccdda9ba57d8e3a634cd8\` ON \`preference_set\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_8e76dcf171c45875c44febb1d8\` ON \`preference_set\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_49030bc57aa0f319cee7996fca\` ON \`preference\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_b4cf0f96bf08cf396f68355522\` ON \`preference\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_88881fbd1fef95a0540f7e7d1e2\` ON \`preference\` (\`preferenceSetId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_650fb4e564a8b4b4ac344270744\` ON \`preference\` (\`preferenceDefinitionId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_3795f9dd15ef3ef2dd1d27e309\` ON \`organization_verification\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_22be0d440df7972d9b3a94aa6d\` ON \`organization_verification\` (\`lifecycleId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_c66eddab0caacb1ef8d46bcafd\` ON \`organization_verification\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_1cc3b275fc2a9d9d9b0ae33b31\` ON \`organization_verification\` (\`lifecycleId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_f67a2d25c945269d602c182fbc\` ON \`collaboration\` (\`timelineId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_b7ece56376ac7ca0b9a56c33b3\` ON \`collaboration\` (\`tagsetTemplateSetId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_98a7abc9f297ffcacb53087dc8\` ON \`innovation_flow\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_a6e050daa4c7a3ab1e411c3651\` ON \`innovation_flow\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_96a8cbe1706f459fd7d883be9b\` ON \`innovation_flow\` (\`profileId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_e6203bc09ec8b93debeb3a44cb9\` ON \`timeline\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_10ed346b16ca044cd84fb1c4034\` ON \`timeline\` (\`calendarId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_5fe58ece01b48496aebc04733d\` ON \`timeline\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_56aae15a664b2889a1a11c2cf8\` ON \`timeline\` (\`calendarId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_94994efc5eb5936ed70f2c55903\` ON \`calendar\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_6e74d59afda096b68d12a69969\` ON \`calendar\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_a3693e1d3472c5ef8b00e51acfd\` ON \`calendar_event\` (\`profileId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_222adf666c59b9eb5ce394714cf\` ON \`calendar_event\` (\`commentsId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_22222ccdda9ba57d8e3a634cd8\` ON \`calendar_event\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_b5069b11030e9608ee4468f850\` ON \`calendar_event\` (\`commentsId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_9349e137959f3ca5818c2e62b3\` ON \`calendar_event\` (\`profileId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_8ee86afa2808a4ab523b9ee6c5\` ON \`calendar_event\` (\`authorizationId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_111838434c7198a323ea6f475fb\` ON \`calendar_event\` (\`profileId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_77755450cf75dc486700ca034c6\` ON \`calendar_event\` (\`calendarId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_6a30f26ca267009fcf514e0e726\` ON \`calendar_event\` (\`createdBy\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_cf776244b01436d8ca5cc76284\` ON \`callout\` (\`framingId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_62ed316cda7b75735b20307b47\` ON \`callout\` (\`commentsId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_36b0da55acff774d0845aeb55f\` ON \`callout\` (\`contributionDefaultsId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_1e740008a7e1512966e3b08414\` ON \`callout\` (\`contributionPolicyId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_67663901817dd09d5906537e088\` ON \`post\` (\`profileId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_1ba25e7d3dc29fa02b88e17fca0\` ON \`vc_interaction\` (\`roomId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_3337f26ca267009fcf514e0e726\` ON \`document\` (\`createdBy\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_11155450cf75dc486700ca034c6\` ON \`document\` (\`storageBucketId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_77771450cf75dc486700ca034c6\` ON \`visual\` (\`profileId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_7ab35130cde781b69259eec7d85\` ON \`tagset\` (\`tagsetTemplateId\`)`);
        await queryRunner.query(`CREATE INDEX \`FK_9ad35130cde781b69259eec7d85\` ON \`tagset_template\` (\`tagsetTemplateSetId\`)`);
    }

}

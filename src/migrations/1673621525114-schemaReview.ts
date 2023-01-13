import {MigrationInterface, QueryRunner} from "typeorm";

export class schemaReview1673621525114 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {

      // Make guids CHAR(36)

      //FIRST DROP CONSTRAINTS
      // await queryRunner.query(
      //   'ALTER TABLE `community` DROP FOREIGN KEY `FK_8e8283bdacc9e770918fe689333`'
      // );
      // await queryRunner.query(
      //   `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_7fbe50fa78a37776ad962cb7643\``
      // );
      // await queryRunner.query(
      //   `ALTER TABLE \`comments\` DROP FOREIGN KEY \`FK_77775901817dd09d5906537e088\``
      // );
      // await queryRunner.query(
      //   `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_c4fb636888fc391cf1d7406e891\``
      // );
      // await queryRunner.query(
      //   `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_62ed316cda7b75735b20307b47e\``
      // );
      // await queryRunner.query(
      //   `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_08d1ccc94b008dbda894a3cfa20\``
      // );
      // await queryRunner.query(
      //   `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_1dc9521a013c92854e92e099335\``
      // );
      // await queryRunner.query(
      //   'ALTER TABLE `aspect_template` DROP FOREIGN KEY `FK_66667901817dd09d5906537e088`'
      // );
      // await queryRunner.query(
      //   'ALTER TABLE `aspect_template` DROP FOREIGN KEY `FK_66666450cf75dc486700ca034c6`'
      // );
      // await queryRunner.query(
      //   `ALTER TABLE \`callout\`  DROP FOREIGN KEY \`FK_22a2ec1b5bca6c54678ffb19eb0\``
      // );
      // await queryRunner.query(
      //   'ALTER TABLE `actor` DROP FOREIGN KEY `FK_a2afa3851ea733de932251b3a1f`'
      // );
      // await queryRunner.query(
      //   'ALTER TABLE `actor` DROP FOREIGN KEY `FK_0f9d41ee193d631a5439bb4f404`'
      // );

      ////////////////
      ////////////////
      // await queryRunner.query(
      //   'ALTER TABLE `actor_group` DROP FOREIGN KEY `FK_bde98d59e8984e7d17034c3b937`'
      // );
      // await queryRunner.query(
      //   'ALTER TABLE `actor_group` DROP FOREIGN KEY `FK_cbb1d7afa052a184471723d3297`'
      // );
      // await queryRunner.query(
      //   'ALTER TABLE `organization` DROP FOREIGN KEY `FK_7671a7e33f6665764f4534a5967`'
      // );
      // await queryRunner.query(
      //   'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_b025a2720e5ee0e5b38774f7a8c`'
      // );
      // await queryRunner.query(
      //   'ALTER TABLE `hub` DROP FOREIGN KEY `FK_b0c3f360534db92017e36a00bb2`'
      // );
      // await queryRunner.query(
      //   'ALTER TABLE `user` DROP FOREIGN KEY `FK_b61c694cacfab25533bd23d9add`'
      // );
      // await queryRunner.query(
      //   'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_c814aa7dc8a68f27d96d5d1782c`'
      // );
      // await queryRunner.query(
      //   'ALTER TABLE `credential` DROP FOREIGN KEY `FK_dbe0929355f82e5995f0b7fd5e2`'
      // );
      // await queryRunner.query(
      //   'ALTER TABLE `agent` DROP FOREIGN KEY `FK_8ed9d1af584fa62f1ad3405b33b`'
      // );
      // await queryRunner.query(
      //   'ALTER TABLE `agreement` DROP FOREIGN KEY `FK_8785b5a8510cabcc25d0f196783`'
      // );
      // await queryRunner.query(
      //   'ALTER TABLE `agreement` DROP FOREIGN KEY `FK_22348b89c2f802a3d75d52fbd57`'
      // );
      // await queryRunner.query(
      //   'ALTER TABLE `application_questions` DROP FOREIGN KEY `FK_8495fae86f13836b0745642baa8`'
      // );
      // await queryRunner.query(
      //   'ALTER TABLE `application` DROP FOREIGN KEY `FK_56f5614fff0028d403704995822`'
      // );
      // await queryRunner.query(
      //   'ALTER TABLE `application` DROP FOREIGN KEY `FK_b4ae3fea4a24b4be1a86dacf8a2`'
      // );
      // await queryRunner.query(
      //   'ALTER TABLE `application` DROP FOREIGN KEY `FK_500cee6f635849f50e19c7e2b76`'
      // );
      // await queryRunner.query(
      //   'ALTER TABLE `application` DROP FOREIGN KEY `FK_7ec2857c7d8d16432ffca1cb3d9`'
      // );
      // await queryRunner.query(
      //   'ALTER TABLE `application_questions` DROP FOREIGN KEY `FK_fe50118fd82e7fe2f74f986a195`'
      // );
      // await queryRunner.query(
      //   `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_deceb07e75a8600e38d5de14a89\``
      // );
      // await queryRunner.query(
      //   `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_67663901817dd09d5906537e088\``
      // );
      // await queryRunner.query(
      //   'ALTER TABLE `user` DROP FOREIGN KEY `FK_09f909622aa177a097256b7cc22`'
      // );
      await queryRunner.query(
        'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_178fa41e46fd331f3501a62f6bf`'
      );
      //THEN UPDATE GUID FIELD TYPE
      await queryRunner.query(
        `ALTER TABLE \`activity\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`activity\` CHANGE COLUMN \`parentID\` \`parentID\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`actor\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`actor\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`actor\` CHANGE COLUMN \`actorGroupId\` \`actorGroupId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`actor_group\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`actor_group\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`actor_group\` CHANGE COLUMN \`ecosystemModelId\` \`ecosystemModelId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`agent\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`agent\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`agreement\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`agreement\` CHANGE COLUMN \`projectId\` \`projectId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`agreement\` CHANGE COLUMN \`tagsetId\` \`tagsetId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`application\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`application\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`application\` CHANGE COLUMN \`hubId\` \`hubId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`application\` CHANGE COLUMN \`userId\` \`userId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`application\` CHANGE COLUMN \`communityId\` \`communityId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`application\` CHANGE COLUMN \`lifecycleId\` \`lifecycleId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`application_questions\` CHANGE COLUMN \`applicationId\` \`applicationId\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`application_questions\` CHANGE COLUMN \`nvpId\` \`nvpId\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` CHANGE COLUMN \`createdBy\` \`createdBy\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` CHANGE COLUMN \`calloutId\` \`calloutId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` CHANGE COLUMN \`profileId\` \`profileId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect_template\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect_template\` CHANGE COLUMN \`templatesSetId\` \`templatesSetId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect_template\` CHANGE COLUMN \`templateInfoId\` \`templateInfoId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`authorization_policy\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` CHANGE COLUMN \`commentsId\` \`commentsId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` CHANGE COLUMN \`collaborationId\` \`collaborationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` CHANGE COLUMN \`cardTemplateId\` \`cardTemplateId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` CHANGE COLUMN \`canvasTemplateId\` \`canvasTemplateId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` CHANGE COLUMN \`checkoutId\` \`checkoutId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` CHANGE COLUMN \`previewId\` \`previewId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` CHANGE COLUMN \`calloutId\` \`calloutId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` CHANGE COLUMN \`createdBy\` \`createdBy\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas_checkout\` CHANGE COLUMN \`canvasId\` \`canvasId\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas_checkout\` CHANGE COLUMN \`lockedBy\` \`lockedBy\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas_template\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`card_profile\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`card_profile\` CHANGE COLUMN \`tagsetId\` \`tagsetId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`hubID\` \`hubID\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`contextId\` \`contextId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`communityId\` \`communityId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`lifecycleId\` \`lifecycleId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`tagsetId\` \`tagsetId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`agentId\` \`agentId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`parentChallengeId\` \`parentChallengeId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`parentHubID\` \`parentHubID\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`preferenceSetId\` \`preferenceSetId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`collaborationId\` \`collaborationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`collaboration\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`collaboration\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`comments\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`comments\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`communication\` CHANGE COLUMN \`hubID\` \`hubID\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`community\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`community\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`community\` CHANGE COLUMN \`hubID\` \`hubID\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`community\` CHANGE COLUMN \`parentCommunityId\` \`parentCommunityId\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`community\` CHANGE COLUMN \`policyId\` \`policyId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`community\` CHANGE COLUMN \`communicationId\` \`communicationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`community_policy\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`context\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`context\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`context\` CHANGE COLUMN \`ecosystemModelId\` \`ecosystemModelId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`credential\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`credential\` CHANGE COLUMN \`resourceID\` \`resourceID\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`credential\` CHANGE COLUMN \`agentId\` \`agentId\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`ecosystem_model\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`ecosystem_model\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` CHANGE COLUMN \`contextId\` \`contextId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` CHANGE COLUMN \`communityId\` \`communityId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` CHANGE COLUMN \`lifecycleId\` \`lifecycleId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` CHANGE COLUMN \`tagsetId\` \`tagsetId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` CHANGE COLUMN \`agentId\` \`agentId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` CHANGE COLUMN \`tagsetId\` \`tagsetId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` CHANGE COLUMN \`collaborationId\` \`collaborationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`innovation_pack\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`innovation_pack\` CHANGE COLUMN \`libraryId\` \`libraryId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`innovation_pack\` CHANGE COLUMN \`templatesSetId\` \`templatesSetId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`library\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`lifecycle\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`lifecycle_template\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`nvp\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` CHANGE COLUMN \`hubID\` \`hubID\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` CHANGE COLUMN \`contextId\` \`contextId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` CHANGE COLUMN \`communityId\` \`communityId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` CHANGE COLUMN \`lifecycleId\` \`lifecycleId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` CHANGE COLUMN \`tagsetId\` \`tagsetId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` CHANGE COLUMN \`agentId\` \`agentId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` CHANGE COLUMN \`collaborationId\` \`collaborationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`organization\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`organization\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`organization\` CHANGE COLUMN \`profileId\` \`profileId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`organization\` CHANGE COLUMN \`agentId\` \`agentId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`organization\` CHANGE COLUMN \`preferenceSetId\` \`preferenceSetId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`organization_verification\` CHANGE COLUMN \`organizationID\` \`organizationID\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`preference_set\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`profile\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`profile\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`project\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`project\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`project\` CHANGE COLUMN \`hubID\` \`hubID\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`project\` CHANGE COLUMN \`lifecycleId\` \`lifecycleId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`project\` CHANGE COLUMN \`tagsetId\` \`tagsetId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`project\` CHANGE COLUMN \`opportunityId\` \`opportunityId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`reference\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`reference\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`reference\` CHANGE COLUMN \`contextId\` \`contextId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`reference\` CHANGE COLUMN \`profileId\` \`profileId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`reference\` CHANGE COLUMN \`cardProfileId\` \`cardProfileId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`relation\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`relation\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`relation\` CHANGE COLUMN \`collaborationId\` \`collaborationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`tagset\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`tagset\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`tagset\` CHANGE COLUMN \`profileId\` \`profileId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`templates_set\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user\` CHANGE COLUMN \`profileId\` \`profileId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user\` CHANGE COLUMN \`agentId\` \`agentId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user\` CHANGE COLUMN \`communicationID\` \`communicationID\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user_group\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user_group\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user_group\` CHANGE COLUMN \`profileId\` \`profileId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user_group\` CHANGE COLUMN \`hubID\` \`hubID\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user_group\` CHANGE COLUMN \`organizationId\` \`organizationId\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user_group\` CHANGE COLUMN \`communityId\` \`communityId\` CHAR(36) NOT NULL;`
      );


      //RE-ADD CONSTRAINTS
      await queryRunner.query(
        'ALTER TABLE `actor` ADD CONSTRAINT `FK_a2afa3851ea733de932251b3a1f` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_22a2ec1b5bca6c54678ffb19eb0\` FOREIGN KEY (\`cardTemplateId\`) REFERENCES \`aspect_template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect_template\` ADD CONSTRAINT \`FK_66666450cf75dc486700ca034c6\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect_template\` ADD CONSTRAINT \`FK_66667901817dd09d5906537e088\` FOREIGN KEY (\`templateInfoId\`) REFERENCES \`template_info\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_1dc9521a013c92854e92e099335\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_08d1ccc94b008dbda894a3cfa20\` FOREIGN KEY (\`checkoutId\`) REFERENCES \`canvas_checkout\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `callout` ADD CONSTRAINT `FK_62ed316cda7b75735b20307b47e` FOREIGN KEY (`commentsId`) REFERENCES `comments`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;'
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_c4fb636888fc391cf1d7406e891\` FOREIGN KEY (\`commentsId\`) REFERENCES \`comments\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`comments\` ADD CONSTRAINT \`FK_77775901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_7fbe50fa78a37776ad962cb7643\` FOREIGN KEY (\`communicationId\`) REFERENCES \`communication\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `community` ADD CONSTRAINT `FK_8e8283bdacc9e770918fe689333` FOREIGN KEY (`parentCommunityId`) REFERENCES `community`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `actor` ADD CONSTRAINT `FK_0f9d41ee193d631a5439bb4f404` FOREIGN KEY (`actorGroupId`) REFERENCES `actor_group`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );

      // CHANGE COLUMN column types
      await queryRunner.query(
        `ALTER TABLE \`aspect\` CHANGE COLUMN \`nameID\` \`nameID\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`project\` CHANGE COLUMN \`nameID\` \`nameID\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` CHANGE COLUMN \`nameID\` \`nameID\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`organization\` CHANGE COLUMN \`nameID\` \`nameID\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user\` CHANGE COLUMN \`nameID\` \`nameID\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` CHANGE COLUMN \`displayName\` \`displayName\` VARCHAR(255) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` CHANGE COLUMN \`type\` \`type\` varchar(255) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect_template\` CHANGE COLUMN \`type\` \`type\` text NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`preference_definition\` CHANGE COLUMN \`displayName\` \`displayName\` varchar(128) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`preference_definition\` CHANGE COLUMN \`definitionSet\` \`definitionSet\` varchar(128) NOT NULL;`
      );

      // Alter constraints
      await queryRunner.query(
        ` ALTER TABLE \`challenge\` ADD CONSTRAINT FK_c890de5a08d363719a41703a638 FOREIGN KEY (preferenceSetId) REFERENCES preference_set(id) ON DELETE SET NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` ADD CONSTRAINT FK_6bf7adf4308991457fdb04624e2 FOREIGN KEY (preferenceSetId) REFERENCES preference_set(id) ON DELETE SET NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`organization\` ADD CONSTRAINT FK_c07b5b4c96fa89cb80215827668 FOREIGN KEY (preferenceSetId) REFERENCES preference_set(id) ON DELETE SET NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user\` ADD CONSTRAINT FK_5ea996d22fbd9d522a59a39b74e FOREIGN KEY (preferenceSetId) REFERENCES preference_set(id) ON DELETE SET NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` ADD CONSTRAINT FK_c7b34f838919f526f829295cf86 FOREIGN KEY (previewId) REFERENCES visual(id) ON DELETE SET NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` ADD CONSTRAINT FK_00a8c330495ef844bfc6975ec89 FOREIGN KEY (authorizationId) REFERENCES authorization_policy(id) ON DELETE SET NULL;`
      );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      // //REVERT FKs
      // await queryRunner.query(
      //   ` ALTER TABLE \`challenge\` DROP FOREIGN KEY FK_c890de5a08d363719a41703a638;`
      // );
      // await queryRunner.query(
      //   `ALTER TABLE \`hub\` DROP FOREIGN KEY FK_6bf7adf4308991457fdb04624e2;`
      // );
      // await queryRunner.query(
      //   `ALTER TABLE \`organization\` DROP FOREIGN KEY FK_c07b5b4c96fa89cb80215827668;`
      // );
      // await queryRunner.query(
      //   `ALTER TABLE \`user\` DROP FOREIGN KEY FK_5ea996d22fbd9d522a59a39b74e;`
      // );
      // await queryRunner.query(
      //   `ALTER TABLE \`canvas\` DROP FOREIGN KEY FK_c7b34f838919f526f829295cf86;`
      // );
      // await queryRunner.query(
      //   `ALTER TABLE \`aspect\` DROP FOREIGN KEY FK_00a8c330495ef844bfc6975ec89;`
      // );





      // Make guids VARCHAR(36)

      //FIRST DROP CONSTRAINTS
      await queryRunner.query(
        'ALTER TABLE `community` DROP FOREIGN KEY `FK_8e8283bdacc9e770918fe689333`'
      );
      await queryRunner.query(
        `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_7fbe50fa78a37776ad962cb7643\``
      );
      await queryRunner.query(
        `ALTER TABLE \`comments\` DROP FOREIGN KEY \`FK_77775901817dd09d5906537e088\``
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_c4fb636888fc391cf1d7406e891\``
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_62ed316cda7b75735b20307b47e\``
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_08d1ccc94b008dbda894a3cfa20\``
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_1dc9521a013c92854e92e099335\``
      );
      await queryRunner.query(
        'ALTER TABLE `aspect_template` DROP FOREIGN KEY `FK_66667901817dd09d5906537e088`'
      );
      await queryRunner.query(
        'ALTER TABLE `aspect_template` DROP FOREIGN KEY `FK_66666450cf75dc486700ca034c6`'
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\`  DROP FOREIGN KEY \`FK_22a2ec1b5bca6c54678ffb19eb0\``
      );

      //THEN MIGRATE GUIDS TYPE
      await queryRunner.query(
        `ALTER TABLE \`activity\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`activity\` CHANGE COLUMN \`parentID\` \`parentID\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`actor\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`actor\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`actor\` CHANGE COLUMN \`actorGroupId\` \`actorGroupId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`actor_group\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`actor_group\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`actor_group\` CHANGE COLUMN \`ecosystemModelId\` \`ecosystemModelId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`agent\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`agent\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`agreement\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`agreement\` CHANGE COLUMN \`projectId\` \`projectId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`agreement\` CHANGE COLUMN \`tagsetId\` \`tagsetId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`application\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`application\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`application\` CHANGE COLUMN \`hubId\` \`hubId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`application\` CHANGE COLUMN \`userId\` \`userId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`application\` CHANGE COLUMN \`communityId\` \`communityId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`application\` CHANGE COLUMN \`lifecycleId\` \`lifecycleId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`application_questions\` CHANGE COLUMN \`applicationId\` \`applicationId\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`application_questions\` CHANGE COLUMN \`nvpId\` \`nvpId\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` CHANGE COLUMN \`createdBy\` \`createdBy\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` CHANGE COLUMN \`calloutId\` \`calloutId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` CHANGE COLUMN \`profileId\` \`profileId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect_template\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect_template\` CHANGE COLUMN \`templatesSetId\` \`templatesSetId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect_template\` CHANGE COLUMN \`templateInfoId\` \`templateInfoId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`authorization_policy\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` CHANGE COLUMN \`commentsId\` \`commentsId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` CHANGE COLUMN \`collaborationId\` \`collaborationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` CHANGE COLUMN \`cardTemplateId\` \`cardTemplateId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` CHANGE COLUMN \`canvasTemplateId\` \`canvasTemplateId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` CHANGE COLUMN \`checkoutId\` \`checkoutId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` CHANGE COLUMN \`previewId\` \`previewId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` CHANGE COLUMN \`calloutId\` \`calloutId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` CHANGE COLUMN \`createdBy\` \`createdBy\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas_checkout\` CHANGE COLUMN \`canvasId\` \`canvasId\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas_checkout\` CHANGE COLUMN \`lockedBy\` \`lockedBy\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas_template\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`card_profile\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`card_profile\` CHANGE COLUMN \`tagsetId\` \`tagsetId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`hubID\` \`hubID\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`contextId\` \`contextId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`communityId\` \`communityId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`lifecycleId\` \`lifecycleId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`tagsetId\` \`tagsetId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`agentId\` \`agentId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`parentChallengeId\` \`parentChallengeId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`parentHubID\` \`parentHubID\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`preferenceSetId\` \`preferenceSetId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` CHANGE COLUMN \`collaborationId\` \`collaborationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`collaboration\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`collaboration\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`comments\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`comments\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`communication\` CHANGE COLUMN \`hubID\` \`hubID\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`community\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`community\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`community\` CHANGE COLUMN \`hubID\` \`hubID\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`community\` CHANGE COLUMN \`parentCommunityId\` \`parentCommunityId\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`community\` CHANGE COLUMN \`policyId\` \`policyId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`community\` CHANGE COLUMN \`communicationId\` \`communicationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`community_policy\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`context\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`context\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`context\` CHANGE COLUMN \`ecosystemModelId\` \`ecosystemModelId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`credential\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`credential\` CHANGE COLUMN \`resourceID\` \`resourceID\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`credential\` CHANGE COLUMN \`agentId\` \`agentId\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`ecosystem_model\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`ecosystem_model\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` CHANGE COLUMN \`contextId\` \`contextId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` CHANGE COLUMN \`communityId\` \`communityId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` CHANGE COLUMN \`lifecycleId\` \`lifecycleId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` CHANGE COLUMN \`tagsetId\` \`tagsetId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` CHANGE COLUMN \`agentId\` \`agentId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` CHANGE COLUMN \`tagsetId\` \`tagsetId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` CHANGE COLUMN \`collaborationId\` \`collaborationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`innovation_pack\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`innovation_pack\` CHANGE COLUMN \`libraryId\` \`libraryId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`innovation_pack\` CHANGE COLUMN \`templatesSetId\` \`templatesSetId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`library\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`lifecycle\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`lifecycle_template\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`nvp\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` CHANGE COLUMN \`hubID\` \`hubID\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` CHANGE COLUMN \`contextId\` \`contextId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` CHANGE COLUMN \`communityId\` \`communityId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` CHANGE COLUMN \`lifecycleId\` \`lifecycleId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` CHANGE COLUMN \`tagsetId\` \`tagsetId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` CHANGE COLUMN \`agentId\` \`agentId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` CHANGE COLUMN \`collaborationId\` \`collaborationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`organization\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`organization\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`organization\` CHANGE COLUMN \`profileId\` \`profileId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`organization\` CHANGE COLUMN \`agentId\` \`agentId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`organization\` CHANGE COLUMN \`preferenceSetId\` \`preferenceSetId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`organization_verification\` CHANGE COLUMN \`organizationID\` \`organizationID\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`preference_set\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`profile\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`profile\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`project\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`project\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`project\` CHANGE COLUMN \`hubID\` \`hubID\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`project\` CHANGE COLUMN \`lifecycleId\` \`lifecycleId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`project\` CHANGE COLUMN \`tagsetId\` \`tagsetId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`project\` CHANGE COLUMN \`opportunityId\` \`opportunityId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`reference\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`reference\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`reference\` CHANGE COLUMN \`contextId\` \`contextId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`reference\` CHANGE COLUMN \`profileId\` \`profileId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`reference\` CHANGE COLUMN \`cardProfileId\` \`cardProfileId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`relation\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`relation\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`relation\` CHANGE COLUMN \`collaborationId\` \`collaborationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`tagset\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`tagset\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`tagset\` CHANGE COLUMN \`profileId\` \`profileId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`templates_set\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user\` CHANGE COLUMN \`profileId\` \`profileId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user\` CHANGE COLUMN \`agentId\` \`agentId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user\` CHANGE COLUMN \`communicationID\` \`communicationID\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user_group\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user_group\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user_group\` CHANGE COLUMN \`profileId\` \`profileId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user_group\` CHANGE COLUMN \`hubID\` \`hubID\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user_group\` CHANGE COLUMN \`organizationId\` \`organizationId\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user_group\` CHANGE COLUMN \`communityId\` \`communityId\` VARCHAR(36) NOT NULL;`
      );

      //RE-ADD CONSTRAINTS
      await queryRunner.query(
        `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_22a2ec1b5bca6c54678ffb19eb0\` FOREIGN KEY (\`cardTemplateId\`) REFERENCES \`aspect_template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect_template\` ADD CONSTRAINT \`FK_66666450cf75dc486700ca034c6\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect_template\` ADD CONSTRAINT \`FK_66667901817dd09d5906537e088\` FOREIGN KEY (\`templateInfoId\`) REFERENCES \`template_info\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_1dc9521a013c92854e92e099335\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_08d1ccc94b008dbda894a3cfa20\` FOREIGN KEY (\`checkoutId\`) REFERENCES \`canvas_checkout\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `callout` ADD CONSTRAINT `FK_62ed316cda7b75735b20307b47e` FOREIGN KEY (`commentsId`) REFERENCES `comments`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;'
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_c4fb636888fc391cf1d7406e891\` FOREIGN KEY (\`commentsId\`) REFERENCES \`comments\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`comments\` ADD CONSTRAINT \`FK_77775901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_7fbe50fa78a37776ad962cb7643\` FOREIGN KEY (\`communicationId\`) REFERENCES \`communication\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `community` ADD CONSTRAINT `FK_8e8283bdacc9e770918fe689333` FOREIGN KEY (`parentCommunityId`) REFERENCES `community`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
    }

}

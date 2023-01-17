import { ChallengeResolverFields } from "@domain/challenge/challenge/challenge.resolver.fields";
import {MigrationInterface, QueryRunner} from "typeorm";

export class schemaReview1673621525114 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {

      // Make guids CHAR(36)



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
      await queryRunner.query(
        'ALTER TABLE `actor` DROP FOREIGN KEY `FK_a2afa3851ea733de932251b3a1f`'
      );
      await queryRunner.query(
        'ALTER TABLE `actor` DROP FOREIGN KEY `FK_0f9d41ee193d631a5439bb4f404`'
      );
      await queryRunner.query(
        'ALTER TABLE `actor_group` DROP FOREIGN KEY `FK_bde98d59e8984e7d17034c3b937`'
      );
      await queryRunner.query(
        'ALTER TABLE `agent` DROP FOREIGN KEY `FK_8ed9d1af584fa62f1ad3405b33b`'
      );
      await queryRunner.query(
        'ALTER TABLE `actor_group` DROP FOREIGN KEY `FK_cbb1d7afa052a184471723d3297`'
      );
      await queryRunner.query(
        'ALTER TABLE `organization` DROP FOREIGN KEY `FK_7671a7e33f6665764f4534a5967`'
      );
      await queryRunner.query(
        'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_b025a2720e5ee0e5b38774f7a8c`'
      );
      await queryRunner.query(
        'ALTER TABLE `hub` DROP FOREIGN KEY `FK_b0c3f360534db92017e36a00bb2`'
      );
      await queryRunner.query(
        'ALTER TABLE `user` DROP FOREIGN KEY `FK_b61c694cacfab25533bd23d9add`'
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_c814aa7dc8a68f27d96d5d1782c`'
      );
      await queryRunner.query(
        'ALTER TABLE `credential` DROP FOREIGN KEY `FK_dbe0929355f82e5995f0b7fd5e2`'
      );
      await queryRunner.query(
        'ALTER TABLE `agreement` DROP FOREIGN KEY `FK_8785b5a8510cabcc25d0f196783`'
      );
      await queryRunner.query(
        'ALTER TABLE `agreement` DROP FOREIGN KEY `FK_22348b89c2f802a3d75d52fbd57`'
      );
      await queryRunner.query(
        'ALTER TABLE `application_questions` DROP FOREIGN KEY `FK_8495fae86f13836b0745642baa8`'
      );
      await queryRunner.query(
        'ALTER TABLE `application` DROP FOREIGN KEY `FK_56f5614fff0028d403704995822`'
      );
      await queryRunner.query(
        'ALTER TABLE `application` DROP FOREIGN KEY `FK_b4ae3fea4a24b4be1a86dacf8a2`'
      );
      await queryRunner.query(
        'ALTER TABLE `application` DROP FOREIGN KEY `FK_500cee6f635849f50e19c7e2b76`'
      );
      await queryRunner.query(
        'ALTER TABLE `application` DROP FOREIGN KEY `FK_7ec2857c7d8d16432ffca1cb3d9`'
      );
      await queryRunner.query(
        'ALTER TABLE `application_questions` DROP FOREIGN KEY `FK_fe50118fd82e7fe2f74f986a195`'
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_deceb07e75a8600e38d5de14a89\``
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_67663901817dd09d5906537e088\``
      );
      await queryRunner.query(
        'ALTER TABLE `user` DROP FOREIGN KEY `FK_09f909622aa177a097256b7cc22`'
      );
      await queryRunner.query(
        'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_178fa41e46fd331f3501a62f6bf`'
      );
      await queryRunner.query(
        'ALTER TABLE `hub` DROP FOREIGN KEY `FK_17a161eef37c9f07186532ab758`'
      );
      await queryRunner.query(
        `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_22222901817dd09d5906537e088\``
      );
      await queryRunner.query(
        `ALTER TABLE \`card_profile\` DROP FOREIGN KEY \`FK_22223901817dd09d5906537e088\``
      );
      await queryRunner.query(
        `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_262ecf3f5d70b82a48336184251\``
      );
      await queryRunner.query(
        `ALTER TABLE \`library\` DROP FOREIGN KEY \`FK_33333901817dd09d5906537e088\``
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas_checkout\` DROP FOREIGN KEY \`FK_353b042af56f01ce222f08abf49\``
      );
      await queryRunner.query(
        'ALTER TABLE `organization_verification` DROP FOREIGN KEY `FK_3795f9dd15ef3ef2dd1d27e309c`'
      );
      await queryRunner.query(
        `ALTER TABLE \`visual\` DROP FOREIGN KEY \`FK_439d0b187986492b58178a82c3f\``
      );
      await queryRunner.query(
        `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_44333901817dd09d5906537e088\``
      );

      //dropping this key was missing in the original down migration
      await queryRunner.query(
        `ALTER TABLE \`aspect_template\` DROP FOREIGN KEY \`FK_44446901817dd09d5906537e088\``
      );
      //dropping this key was missing in the original down migration
      await queryRunner.query(
        `ALTER TABLE \`canvas_template\` DROP FOREIGN KEY \`FK_45556901817dd09d5906537e088\``
      );
      await queryRunner.query(
        `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_4555dccdda9ba57d8e3a634cd0d\``
      );
      await queryRunner.query(
        `ALTER TABLE \`preference\` DROP FOREIGN KEY \`FK_49030bc57aa0f319cee7996fca1\``
      );
      await queryRunner.query(
        'ALTER TABLE `relation` DROP FOREIGN KEY `FK_53fccd56207915b969b91834e04`'
      );
      await queryRunner.query(
        'ALTER TABLE `context` DROP FOREIGN KEY `FK_5f0dbc3b097ef297bd5f4ddb1a9`'
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_6289dee12effb51320051c6f1fc\``
      );
      await queryRunner.query(
        'ALTER TABLE `ecosystem_model` DROP FOREIGN KEY `FK_658580aea4e1a892227e27db902`'
      );
      //dropping this key was missing in the original down migration
      await queryRunner.query(
        'ALTER TABLE `templates_set` DROP FOREIGN KEY `FK_66666901817dd09d5906537e088`'
      );
      await queryRunner.query(
        'ALTER TABLE `community` DROP FOREIGN KEY `FK_6e7584bfb417bd0f8e8696ab585`'
      );
      await queryRunner.query(
        'ALTER TABLE `reference` DROP FOREIGN KEY `FK_73e8ae665a49366ca7e2866a45d`'
      );
      //dropping this key was missing in the original down migration
      await queryRunner.query(
        'ALTER TABLE `lifecycle_template` DROP FOREIGN KEY `FK_76546901817dd09d5906537e088`'
      );
      await queryRunner.query(
        `ALTER TABLE \`updates\` DROP FOREIGN KEY \`FK_77775901817dd09d5906537e087\``
      );
      //dropping this key was missing in the original down migration
      await queryRunner.query(
        `ALTER TABLE \`preference_set\` DROP FOREIGN KEY \`FK_88885901817dd09d5906537e088\``
      );
      await queryRunner.query(
        `ALTER TABLE \`communication\` DROP FOREIGN KEY \`FK_a20c5901817dd09d5906537e087\``
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_a344b754f33792cbbc58e41e898`'
      );
      await queryRunner.query(
        'ALTER TABLE `profile` DROP FOREIGN KEY `FK_a96475631aba7dce41db03cc8b2`'
      );
      await queryRunner.query(
        'ALTER TABLE `organization` DROP FOREIGN KEY `FK_badc07674ce4e44801e5a5f36ce`'
      );
      await queryRunner.query(
        'ALTER TABLE `tagset` DROP FOREIGN KEY `FK_eb59b98ee6ef26c993d0d75c83c`'
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_fcabc1f3aa38aca70df4f66e938\``
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_9b1c5ee044611ac78249194ec35\``
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\`  DROP FOREIGN KEY \`FK_c506eee0b7d06523b2953d07337\``
      );
      await queryRunner.query(
        'ALTER TABLE `project` DROP FOREIGN KEY `FK_35e34564793a27bb3c209a15245`'
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_7d23d17ce61f11c92ff1ea0ed1a`'
      );
      await queryRunner.query(
        'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_2b8381df8c3a1680f50e4bc2351`'
      );
      await queryRunner.query(
        'ALTER TABLE `organization` DROP FOREIGN KEY `FK_037ba4b170844c039e74aa22ecd`'
      );
      await queryRunner.query(
        'ALTER TABLE `reference` DROP FOREIGN KEY `FK_2f46c698fc4c19a8cc233c5f255`'
      );
      await queryRunner.query(
        'ALTER TABLE `tagset` DROP FOREIGN KEY `FK_81fc213b2d9ad0cddeab1a9ce64`'
      );
      await queryRunner.query(
        'ALTER TABLE `user` DROP FOREIGN KEY `FK_9466682df91534dd95e4dbaa616`'
      );
      await queryRunner.query(
        'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_9912e4cfc1e09848a392a651514`'
      );
      await queryRunner.query(
        'ALTER TABLE `project` DROP FOREIGN KEY `FK_d07535c59062f86e887de8f0a57`'
      );
      await queryRunner.query(
        `ALTER TABLE \`reference\` DROP FOREIGN KEY \`FK_282838434c7198a323ea6f475fb\``
      );
      //dropping this key was missing in the original down migration
      await queryRunner.query(
        `ALTER TABLE \`template_info\` DROP FOREIGN KEY \`FK_77777901817dd09d5906537e088\``
      );
      await queryRunner.query(
         `ALTER TABLE \`card_profile\` DROP FOREIGN KEY \`FK_44443901817dd09d5906537e088\``
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_0e2c355dbb2950851dbc17a4490`'
      );
      await queryRunner.query(
        'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_7d2b222d54b900071b0959f03ef`'
      );
      await queryRunner.query(
        'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_1deebaabfc620e881858333b0d0`'
      );
      await queryRunner.query(
        'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_aa9668dd2340c2d794b414577b6`'
      );
      await queryRunner.query(
        'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_3c535130cde781b69259eec7d85`'
      );
      await queryRunner.query(
        'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_6b1bcaf365212806d8cc1f87b54`'
      );
      await queryRunner.query(
        'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_494b27cb13b59128fb24b365ca6`'
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_d4551f18fed106ae2e20c70f7cb\``
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_6325f4ef25c4e07e723a96ed37c\``
      );
      await queryRunner.query(
        `ALTER TABLE \`relation\` DROP FOREIGN KEY \`FK_701a6f8e3e1da76354571767c3f\``
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_1c7744df92f39ab567084fd8c09`'
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_fa617e79d6b2926edc7b4a3878f\``
      );
      await queryRunner.query(
        'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_9fcc131f256e969d773327f07cb`'
      );
      await queryRunner.query(
        'ALTER TABLE `hub` DROP FOREIGN KEY `FK_f5ad15bcb06a95c2a109fbcce2a`'
      );
      await queryRunner.query(
        `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_35533901817dd09d5906537e088\``
      );
      await queryRunner.query(
        'ALTER TABLE `reference` DROP FOREIGN KEY `FK_07dbf4b02a078a59c216691f5eb`'
      );
      await queryRunner.query(
        `ALTER TABLE \`reference\` DROP FOREIGN KEY \`FK_299938434c7198a323ea6f475fb\``
      );
      await queryRunner.query(
        `ALTER TABLE \`visual\` DROP FOREIGN KEY \`FK_63de1450cf75dc486700ca034c6\``
      );
      await queryRunner.query(
        'ALTER TABLE `hub` DROP FOREIGN KEY `FK_6db8627abbf00b1b986e359054f`'
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_9c169eb500e2d3823154c7b603d`'
      );
      await queryRunner.query(
        'ALTER TABLE `context` DROP FOREIGN KEY `FK_a03169c3f86480ba3863924f4d7`'
      );
      await queryRunner.query(
        'ALTER TABLE `hub` DROP FOREIGN KEY `FK_ec1a68698d32f610a5fc1880c7f`'
      );
      await queryRunner.query(
        'ALTER TABLE `hub` DROP FOREIGN KEY `FK_3a69b0a6c67ead7617634009903`'
      );
      await queryRunner.query(
        `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_77777450cf75dc486700ca034c6\``
      );
      await queryRunner.query(
        `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_55555901817dd09d5906537e088\``
      );
      await queryRunner.query(
        'ALTER TABLE `organization_verification` DROP FOREIGN KEY `FK_22be0d440df7972d9b3a94aa6d5`'
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_6860f1e3ae5509245bdb5c401f3`'
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas_checkout\` DROP FOREIGN KEY \`FK_bd3c7c6c2dbc2a8daf4b1500a69\``
      );
      await queryRunner.query(
        'ALTER TABLE `project` DROP FOREIGN KEY `FK_f425931bb61a95ef6f6d89c9a85`'
      );
      await queryRunner.query(
        'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_e8e32f1e59c349b406a4752e545`'
      );
      await queryRunner.query(
        'ALTER TABLE `project` DROP FOREIGN KEY `FK_fac8673f44e6b295e30d1c1739a`'
      );
      //THEN UPDATE GUID FIELD TYPE
      await queryRunner.query(
        `ALTER TABLE \`templates_set\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
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
        `ALTER TABLE \`community\` CHANGE COLUMN \`parentCommunityId\` \`parentCommunityId\` CHAR(36) NULL;`
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
      await queryRunner.query(
        `ALTER TABLE \`activity\` CHANGE COLUMN \`id\` \`id\` CHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` CHANGE COLUMN \`challengeId\` \`challengeId\` CHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect_template\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` CHAR(36) NULL;`
      );

      //MAKE DATE TYPES CONSISTENT
      await queryRunner.query(
        `ALTER TABLE \`aspect\` CHANGE COLUMN \`type\` \`type\` VARCHAR(128) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` CHANGE COLUMN \`nameID\` \`nameID\` VARCHAR(36) NOT NULL;`
      );

      await queryRunner.query(
        `ALTER TABLE \`lifecycle_template\` CHANGE COLUMN \`type\` \`type\` VARCHAR(128) NOT NULL;`
      );


      //RE-ADD CONSTRAINTS
      await queryRunner.query(
        'ALTER TABLE `actor` ADD CONSTRAINT `FK_a2afa3851ea733de932251b3a1f` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
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
        'ALTER TABLE `actor` ADD CONSTRAINT `FK_0f9d41ee193d631a5439bb4f404` FOREIGN KEY (`actorGroupId`) REFERENCES `actor_group`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `community` ADD CONSTRAINT `FK_8e8283bdacc9e770918fe689333` FOREIGN KEY (`parentCommunityId`) REFERENCES `community`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `actor_group` ADD CONSTRAINT `FK_bde98d59e8984e7d17034c3b937` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `actor_group` ADD CONSTRAINT `FK_cbb1d7afa052a184471723d3297` FOREIGN KEY (`ecosystemModelId`) REFERENCES `ecosystem_model`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `organization` ADD CONSTRAINT `FK_7671a7e33f6665764f4534a5967` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `challenge` ADD CONSTRAINT `FK_b025a2720e5ee0e5b38774f7a8c` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `hub` ADD CONSTRAINT `FK_b0c3f360534db92017e36a00bb2` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `user` ADD CONSTRAINT `FK_b61c694cacfab25533bd23d9add` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_c814aa7dc8a68f27d96d5d1782c` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `credential` ADD CONSTRAINT `FK_dbe0929355f82e5995f0b7fd5e2` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `agent` ADD CONSTRAINT `FK_8ed9d1af584fa62f1ad3405b33b` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `agreement` ADD CONSTRAINT `FK_8785b5a8510cabcc25d0f196783` FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `agreement` ADD CONSTRAINT `FK_22348b89c2f802a3d75d52fbd57` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `application_questions` ADD CONSTRAINT `FK_8495fae86f13836b0745642baa8` FOREIGN KEY (`applicationId`) REFERENCES `application`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `application` ADD CONSTRAINT `FK_56f5614fff0028d403704995822` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `application` ADD CONSTRAINT `FK_b4ae3fea4a24b4be1a86dacf8a2` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `application` ADD CONSTRAINT `FK_500cee6f635849f50e19c7e2b76` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `application` ADD CONSTRAINT `FK_7ec2857c7d8d16432ffca1cb3d9` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `application_questions` ADD CONSTRAINT `FK_fe50118fd82e7fe2f74f986a195` FOREIGN KEY (`nvpId`) REFERENCES `nvp`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_deceb07e75a8600e38d5de14a89\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_67663901817dd09d5906537e088\` FOREIGN KEY (\`profileId\`) REFERENCES \`card_profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `user` ADD CONSTRAINT `FK_09f909622aa177a097256b7cc22` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `challenge` ADD CONSTRAINT `FK_178fa41e46fd331f3501a62f6bf` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `hub` ADD CONSTRAINT `FK_17a161eef37c9f07186532ab758` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_22222901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`card_profile\` ADD CONSTRAINT \`FK_22223901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_262ecf3f5d70b82a48336184251\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`library\` ADD CONSTRAINT \`FK_33333901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas_checkout\` ADD CONSTRAINT \`FK_353b042af56f01ce222f08abf49\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `organization_verification` ADD CONSTRAINT `FK_3795f9dd15ef3ef2dd1d27e309c` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );;
      await queryRunner.query(
        `ALTER TABLE \`visual\` ADD CONSTRAINT \`FK_439d0b187986492b58178a82c3f\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_44333901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect_template\` ADD CONSTRAINT \`FK_44446901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas_template\` ADD CONSTRAINT \`FK_45556901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_4555dccdda9ba57d8e3a634cd0d\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`preference\` ADD CONSTRAINT \`FK_49030bc57aa0f319cee7996fca1\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `relation` ADD CONSTRAINT `FK_53fccd56207915b969b91834e04` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `context` ADD CONSTRAINT `FK_5f0dbc3b097ef297bd5f4ddb1a9` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_6289dee12effb51320051c6f1fc\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `ecosystem_model` ADD CONSTRAINT `FK_658580aea4e1a892227e27db902` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`templates_set\` ADD CONSTRAINT \`FK_66666901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `community` ADD CONSTRAINT `FK_6e7584bfb417bd0f8e8696ab585` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `reference` ADD CONSTRAINT `FK_73e8ae665a49366ca7e2866a45d` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`lifecycle_template\` ADD CONSTRAINT \`FK_76546901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`updates\` ADD CONSTRAINT \`FK_77775901817dd09d5906537e087\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`preference_set\` ADD CONSTRAINT \`FK_88885901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`communication\` ADD CONSTRAINT \`FK_a20c5901817dd09d5906537e087\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_a344b754f33792cbbc58e41e898` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `profile` ADD CONSTRAINT `FK_a96475631aba7dce41db03cc8b2` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `organization` ADD CONSTRAINT `FK_badc07674ce4e44801e5a5f36ce` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `user_group` ADD CONSTRAINT `FK_e8e32f1e59c349b406a4752e545` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `tagset` ADD CONSTRAINT `FK_eb59b98ee6ef26c993d0d75c83c` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `project` ADD CONSTRAINT `FK_fac8673f44e6b295e30d1c1739a` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_fcabc1f3aa38aca70df4f66e938\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_9b1c5ee044611ac78249194ec35\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_c506eee0b7d06523b2953d07337\` FOREIGN KEY (\`canvasTemplateId\`) REFERENCES \`canvas_template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`card_profile\` ADD CONSTRAINT \`FK_44443901817dd09d5906537e088\` FOREIGN KEY (\`tagsetId\`) REFERENCES \`tagset\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_0e2c355dbb2950851dbc17a4490` FOREIGN KEY (`challengeId`) REFERENCES `challenge`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `challenge` ADD CONSTRAINT `FK_7d2b222d54b900071b0959f03ef` FOREIGN KEY (`parentChallengeId`) REFERENCES `challenge`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
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
        'ALTER TABLE `challenge` ADD CONSTRAINT `FK_494b27cb13b59128fb24b365ca6` FOREIGN KEY (`parenthubId`) REFERENCES `hub`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_d4551f18fed106ae2e20c70f7cb\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_6325f4ef25c4e07e723a96ed37c\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`relation\` ADD CONSTRAINT \`FK_701a6f8e3e1da76354571767c3f\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_1c7744df92f39ab567084fd8c09` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_fa617e79d6b2926edc7b4a3878f\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `user_group` ADD CONSTRAINT `FK_9fcc131f256e969d773327f07cb` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `hub` ADD CONSTRAINT `FK_f5ad15bcb06a95c2a109fbcce2a` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_35533901817dd09d5906537e088\` FOREIGN KEY (\`policyId\`) REFERENCES \`community_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `reference` ADD CONSTRAINT `FK_07dbf4b02a078a59c216691f5eb` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`reference\` ADD CONSTRAINT \`FK_299938434c7198a323ea6f475fb\` FOREIGN KEY (\`contextRecommendationId\`) REFERENCES \`context\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`visual\` ADD CONSTRAINT \`FK_63de1450cf75dc486700ca034c6\` FOREIGN KEY (\`contextId\`) REFERENCES \`context\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `hub` ADD CONSTRAINT `FK_6db8627abbf00b1b986e359054f` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_9c169eb500e2d3823154c7b603d` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `context` ADD CONSTRAINT `FK_a03169c3f86480ba3863924f4d7` FOREIGN KEY (`ecosystemModelId`) REFERENCES `ecosystem_model`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `hub` ADD CONSTRAINT `FK_ec1a68698d32f610a5fc1880c7f` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `hub` ADD CONSTRAINT `FK_3a69b0a6c67ead7617634009903` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_77777450cf75dc486700ca034c6\` FOREIGN KEY (\`libraryId\`) REFERENCES \`library\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_55555901817dd09d5906537e088\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `organization_verification` ADD CONSTRAINT `FK_22be0d440df7972d9b3a94aa6d5` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_6860f1e3ae5509245bdb5c401f3` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas_checkout\` ADD CONSTRAINT \`FK_bd3c7c6c2dbc2a8daf4b1500a69\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `project` ADD CONSTRAINT `FK_f425931bb61a95ef6f6d89c9a85` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `project` ADD CONSTRAINT `FK_35e34564793a27bb3c209a15245` FOREIGN KEY (`opportunityId`) REFERENCES `opportunity`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_7d23d17ce61f11c92ff1ea0ed1a` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `user_group` ADD CONSTRAINT `FK_2b8381df8c3a1680f50e4bc2351` FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `organization` ADD CONSTRAINT `FK_037ba4b170844c039e74aa22ecd` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `reference` ADD CONSTRAINT `FK_2f46c698fc4c19a8cc233c5f255` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `tagset` ADD CONSTRAINT `FK_81fc213b2d9ad0cddeab1a9ce64` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `user` ADD CONSTRAINT `FK_9466682df91534dd95e4dbaa616` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `user_group` ADD CONSTRAINT `FK_9912e4cfc1e09848a392a651514` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `project` ADD CONSTRAINT `FK_d07535c59062f86e887de8f0a57` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`reference\` ADD CONSTRAINT \`FK_282838434c7198a323ea6f475fb\` FOREIGN KEY (\`cardProfileId\`) REFERENCES \`card_profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`template_info\` ADD CONSTRAINT \`FK_77777901817dd09d5906537e088\` FOREIGN KEY (\`tagsetId\`) REFERENCES \`tagset\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
      await queryRunner.query(
        ` ALTER TABLE \`challenge\` DROP FOREIGN KEY FK_c890de5a08d363719a41703a638;`
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` DROP FOREIGN KEY FK_6bf7adf4308991457fdb04624e2;`
      );
      await queryRunner.query(
        `ALTER TABLE \`organization\` DROP FOREIGN KEY FK_c07b5b4c96fa89cb80215827668;`
      );
      await queryRunner.query(
        `ALTER TABLE \`user\` DROP FOREIGN KEY FK_5ea996d22fbd9d522a59a39b74e;`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` DROP FOREIGN KEY FK_c7b34f838919f526f829295cf86;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` DROP FOREIGN KEY FK_00a8c330495ef844bfc6975ec89;`
      );

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
      await queryRunner.query(
        'ALTER TABLE `actor` DROP FOREIGN KEY `FK_a2afa3851ea733de932251b3a1f`'
      );
      await queryRunner.query(
        'ALTER TABLE `actor` DROP FOREIGN KEY `FK_0f9d41ee193d631a5439bb4f404`'
      );
      await queryRunner.query(
        'ALTER TABLE `actor_group` DROP FOREIGN KEY `FK_bde98d59e8984e7d17034c3b937`'
      );
      await queryRunner.query(
        'ALTER TABLE `agent` DROP FOREIGN KEY `FK_8ed9d1af584fa62f1ad3405b33b`'
      );
      await queryRunner.query(
        'ALTER TABLE `actor_group` DROP FOREIGN KEY `FK_cbb1d7afa052a184471723d3297`'
      );
      await queryRunner.query(
        'ALTER TABLE `organization` DROP FOREIGN KEY `FK_7671a7e33f6665764f4534a5967`'
      );
      await queryRunner.query(
        'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_b025a2720e5ee0e5b38774f7a8c`'
      );
      await queryRunner.query(
        'ALTER TABLE `hub` DROP FOREIGN KEY `FK_b0c3f360534db92017e36a00bb2`'
      );
      await queryRunner.query(
        'ALTER TABLE `user` DROP FOREIGN KEY `FK_b61c694cacfab25533bd23d9add`'
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_c814aa7dc8a68f27d96d5d1782c`'
      );
      await queryRunner.query(
        'ALTER TABLE `credential` DROP FOREIGN KEY `FK_dbe0929355f82e5995f0b7fd5e2`'
      );
      await queryRunner.query(
        'ALTER TABLE `agreement` DROP FOREIGN KEY `FK_8785b5a8510cabcc25d0f196783`'
      );
      await queryRunner.query(
        'ALTER TABLE `agreement` DROP FOREIGN KEY `FK_22348b89c2f802a3d75d52fbd57`'
      );
      await queryRunner.query(
        'ALTER TABLE `application_questions` DROP FOREIGN KEY `FK_8495fae86f13836b0745642baa8`'
      );
      await queryRunner.query(
        'ALTER TABLE `application` DROP FOREIGN KEY `FK_56f5614fff0028d403704995822`'
      );
      await queryRunner.query(
        'ALTER TABLE `application` DROP FOREIGN KEY `FK_b4ae3fea4a24b4be1a86dacf8a2`'
      );
      await queryRunner.query(
        'ALTER TABLE `application` DROP FOREIGN KEY `FK_500cee6f635849f50e19c7e2b76`'
      );
      await queryRunner.query(
        'ALTER TABLE `application` DROP FOREIGN KEY `FK_7ec2857c7d8d16432ffca1cb3d9`'
      );
      await queryRunner.query(
        'ALTER TABLE `application_questions` DROP FOREIGN KEY `FK_fe50118fd82e7fe2f74f986a195`'
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_deceb07e75a8600e38d5de14a89\``
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_67663901817dd09d5906537e088\``
      );
      await queryRunner.query(
        'ALTER TABLE `user` DROP FOREIGN KEY `FK_09f909622aa177a097256b7cc22`'
      );
      await queryRunner.query(
        'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_178fa41e46fd331f3501a62f6bf`'
      );
      await queryRunner.query(
        'ALTER TABLE `hub` DROP FOREIGN KEY `FK_17a161eef37c9f07186532ab758`'
      );
      await queryRunner.query(
        `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_22222901817dd09d5906537e088\``
      );
      await queryRunner.query(
        `ALTER TABLE \`card_profile\` DROP FOREIGN KEY \`FK_22223901817dd09d5906537e088\``
      );
      await queryRunner.query(
        `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_262ecf3f5d70b82a48336184251\``
      );
      await queryRunner.query(
        `ALTER TABLE \`library\` DROP FOREIGN KEY \`FK_33333901817dd09d5906537e088\``
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas_checkout\` DROP FOREIGN KEY \`FK_353b042af56f01ce222f08abf49\``
      );
      await queryRunner.query(
        'ALTER TABLE `organization_verification` DROP FOREIGN KEY `FK_3795f9dd15ef3ef2dd1d27e309c`'
      );
      await queryRunner.query(
        `ALTER TABLE \`visual\` DROP FOREIGN KEY \`FK_439d0b187986492b58178a82c3f\``
      );
      await queryRunner.query(
        `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_44333901817dd09d5906537e088\``
      );

      //dropping this key was missing in the original down migration
      await queryRunner.query(
        `ALTER TABLE \`aspect_template\` DROP FOREIGN KEY \`FK_44446901817dd09d5906537e088\``
      );
      //dropping this key was missing in the original down migration
      await queryRunner.query(
        `ALTER TABLE \`canvas_template\` DROP FOREIGN KEY \`FK_45556901817dd09d5906537e088\``
      );
      await queryRunner.query(
        `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_4555dccdda9ba57d8e3a634cd0d\``
      );
      await queryRunner.query(
        `ALTER TABLE \`preference\` DROP FOREIGN KEY \`FK_49030bc57aa0f319cee7996fca1\``
      );
      await queryRunner.query(
        'ALTER TABLE `relation` DROP FOREIGN KEY `FK_53fccd56207915b969b91834e04`'
      );
      await queryRunner.query(
        'ALTER TABLE `context` DROP FOREIGN KEY `FK_5f0dbc3b097ef297bd5f4ddb1a9`'
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_6289dee12effb51320051c6f1fc\``
      );
      await queryRunner.query(
        'ALTER TABLE `ecosystem_model` DROP FOREIGN KEY `FK_658580aea4e1a892227e27db902`'
      );
      //dropping this key was missing in the original down migration
      await queryRunner.query(
        'ALTER TABLE `templates_set` DROP FOREIGN KEY `FK_66666901817dd09d5906537e088`'
      );
      await queryRunner.query(
        'ALTER TABLE `community` DROP FOREIGN KEY `FK_6e7584bfb417bd0f8e8696ab585`'
      );
      await queryRunner.query(
        'ALTER TABLE `reference` DROP FOREIGN KEY `FK_73e8ae665a49366ca7e2866a45d`'
      );
      //dropping this key was missing in the original down migration
      await queryRunner.query(
        'ALTER TABLE `lifecycle_template` DROP FOREIGN KEY `FK_76546901817dd09d5906537e088`'
      );
      await queryRunner.query(
        `ALTER TABLE \`updates\` DROP FOREIGN KEY \`FK_77775901817dd09d5906537e087\``
      );
      //dropping this key was missing in the original down migration
      await queryRunner.query(
        `ALTER TABLE \`preference_set\` DROP FOREIGN KEY \`FK_88885901817dd09d5906537e088\``
      );
      await queryRunner.query(
        `ALTER TABLE \`communication\` DROP FOREIGN KEY \`FK_a20c5901817dd09d5906537e087\``
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_a344b754f33792cbbc58e41e898`'
      );
      await queryRunner.query(
        'ALTER TABLE `profile` DROP FOREIGN KEY `FK_a96475631aba7dce41db03cc8b2`'
      );
      await queryRunner.query(
        'ALTER TABLE `organization` DROP FOREIGN KEY `FK_badc07674ce4e44801e5a5f36ce`'
      );
      await queryRunner.query(
        'ALTER TABLE `tagset` DROP FOREIGN KEY `FK_eb59b98ee6ef26c993d0d75c83c`'
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_fcabc1f3aa38aca70df4f66e938\``
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_9b1c5ee044611ac78249194ec35\``
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\`  DROP FOREIGN KEY \`FK_c506eee0b7d06523b2953d07337\``
      );
      await queryRunner.query(
        'ALTER TABLE `project` DROP FOREIGN KEY `FK_35e34564793a27bb3c209a15245`'
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_7d23d17ce61f11c92ff1ea0ed1a`'
      );
      await queryRunner.query(
        'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_2b8381df8c3a1680f50e4bc2351`'
      );
      await queryRunner.query(
        'ALTER TABLE `organization` DROP FOREIGN KEY `FK_037ba4b170844c039e74aa22ecd`'
      );
      await queryRunner.query(
        'ALTER TABLE `reference` DROP FOREIGN KEY `FK_2f46c698fc4c19a8cc233c5f255`'
      );
      await queryRunner.query(
        'ALTER TABLE `tagset` DROP FOREIGN KEY `FK_81fc213b2d9ad0cddeab1a9ce64`'
      );
      await queryRunner.query(
        'ALTER TABLE `user` DROP FOREIGN KEY `FK_9466682df91534dd95e4dbaa616`'
      );
      await queryRunner.query(
        'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_9912e4cfc1e09848a392a651514`'
      );
      await queryRunner.query(
        'ALTER TABLE `project` DROP FOREIGN KEY `FK_d07535c59062f86e887de8f0a57`'
      );
      await queryRunner.query(
        `ALTER TABLE \`reference\` DROP FOREIGN KEY \`FK_282838434c7198a323ea6f475fb\``
      );
      //dropping this key was missing in the original down migration
      await queryRunner.query(
        `ALTER TABLE \`template_info\` DROP FOREIGN KEY \`FK_77777901817dd09d5906537e088\``
      );
      await queryRunner.query(
         `ALTER TABLE \`card_profile\` DROP FOREIGN KEY \`FK_44443901817dd09d5906537e088\``
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_0e2c355dbb2950851dbc17a4490`'
      );
      await queryRunner.query(
        'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_7d2b222d54b900071b0959f03ef`'
      );
      await queryRunner.query(
        'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_1deebaabfc620e881858333b0d0`'
      );
      await queryRunner.query(
        'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_aa9668dd2340c2d794b414577b6`'
      );
      await queryRunner.query(
        'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_3c535130cde781b69259eec7d85`'
      );
      await queryRunner.query(
        'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_6b1bcaf365212806d8cc1f87b54`'
      );
      await queryRunner.query(
        'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_494b27cb13b59128fb24b365ca6`'
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_d4551f18fed106ae2e20c70f7cb\``
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_6325f4ef25c4e07e723a96ed37c\``
      );
      await queryRunner.query(
        `ALTER TABLE \`relation\` DROP FOREIGN KEY \`FK_701a6f8e3e1da76354571767c3f\``
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_1c7744df92f39ab567084fd8c09`'
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_fa617e79d6b2926edc7b4a3878f\``
      );
      await queryRunner.query(
        'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_9fcc131f256e969d773327f07cb`'
      );
      await queryRunner.query(
        'ALTER TABLE `hub` DROP FOREIGN KEY `FK_f5ad15bcb06a95c2a109fbcce2a`'
      );
      await queryRunner.query(
        `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_35533901817dd09d5906537e088\``
      );
      await queryRunner.query(
        'ALTER TABLE `reference` DROP FOREIGN KEY `FK_07dbf4b02a078a59c216691f5eb`'
      );
      await queryRunner.query(
        `ALTER TABLE \`reference\` DROP FOREIGN KEY \`FK_299938434c7198a323ea6f475fb\``
      );
      await queryRunner.query(
        `ALTER TABLE \`visual\` DROP FOREIGN KEY \`FK_63de1450cf75dc486700ca034c6\``
      );
      await queryRunner.query(
        'ALTER TABLE `hub` DROP FOREIGN KEY `FK_6db8627abbf00b1b986e359054f`'
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_9c169eb500e2d3823154c7b603d`'
      );
      await queryRunner.query(
        'ALTER TABLE `context` DROP FOREIGN KEY `FK_a03169c3f86480ba3863924f4d7`'
      );
      await queryRunner.query(
        'ALTER TABLE `hub` DROP FOREIGN KEY `FK_ec1a68698d32f610a5fc1880c7f`'
      );
      await queryRunner.query(
        'ALTER TABLE `hub` DROP FOREIGN KEY `FK_3a69b0a6c67ead7617634009903`'
      );
      await queryRunner.query(
        `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_77777450cf75dc486700ca034c6\``
      );
      await queryRunner.query(
        `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_55555901817dd09d5906537e088\``
      );
      await queryRunner.query(
        'ALTER TABLE `organization_verification` DROP FOREIGN KEY `FK_22be0d440df7972d9b3a94aa6d5`'
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_6860f1e3ae5509245bdb5c401f3`'
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas_checkout\` DROP FOREIGN KEY \`FK_bd3c7c6c2dbc2a8daf4b1500a69\``
      );
      await queryRunner.query(
        'ALTER TABLE `project` DROP FOREIGN KEY `FK_f425931bb61a95ef6f6d89c9a85`'
      );
      await queryRunner.query(
        'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_e8e32f1e59c349b406a4752e545`'
      );
      await queryRunner.query(
        'ALTER TABLE `project` DROP FOREIGN KEY `FK_fac8673f44e6b295e30d1c1739a`'
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
        `ALTER TABLE \`community\` CHANGE COLUMN \`parentCommunityId\` \`parentCommunityId\` VARCHAR(36) NULL;`
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
      await queryRunner.query(
        `ALTER TABLE \`activity\` CHANGE COLUMN \`id\` \`id\` VARCHAR(36) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` CHANGE COLUMN \`challengeId\` \`challengeId\` VARCHAR(36) NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect_template\` CHANGE COLUMN \`authorizationId\` \`authorizationId\` VARCHAR(36) NULL;`
      );

      //MAKE DATE TYPES CONSISTENT
      await queryRunner.query(
        `ALTER TABLE \`aspect\` CHANGE COLUMN \`type\` \`type\` CHAR(255) NOT NULL;`
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` CHANGE COLUMN \`nameID\` \`nameID\` VARCHAR(255) NOT NULL;`
      );

      await queryRunner.query(
        `ALTER TABLE \`lifecycle_template\` CHANGE COLUMN \`type\` \`type\` CHAR(128) NOT NULL;`
      );

      //RE-ADD CONSTRAINTS
      await queryRunner.query(
        'ALTER TABLE `actor` ADD CONSTRAINT `FK_a2afa3851ea733de932251b3a1f` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
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
        'ALTER TABLE `actor` ADD CONSTRAINT `FK_0f9d41ee193d631a5439bb4f404` FOREIGN KEY (`actorGroupId`) REFERENCES `actor_group`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `community` ADD CONSTRAINT `FK_8e8283bdacc9e770918fe689333` FOREIGN KEY (`parentCommunityId`) REFERENCES `community`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `actor_group` ADD CONSTRAINT `FK_bde98d59e8984e7d17034c3b937` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `actor_group` ADD CONSTRAINT `FK_cbb1d7afa052a184471723d3297` FOREIGN KEY (`ecosystemModelId`) REFERENCES `ecosystem_model`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `organization` ADD CONSTRAINT `FK_7671a7e33f6665764f4534a5967` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `challenge` ADD CONSTRAINT `FK_b025a2720e5ee0e5b38774f7a8c` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `hub` ADD CONSTRAINT `FK_b0c3f360534db92017e36a00bb2` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `user` ADD CONSTRAINT `FK_b61c694cacfab25533bd23d9add` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_c814aa7dc8a68f27d96d5d1782c` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `credential` ADD CONSTRAINT `FK_dbe0929355f82e5995f0b7fd5e2` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `agent` ADD CONSTRAINT `FK_8ed9d1af584fa62f1ad3405b33b` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `agreement` ADD CONSTRAINT `FK_8785b5a8510cabcc25d0f196783` FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `agreement` ADD CONSTRAINT `FK_22348b89c2f802a3d75d52fbd57` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `application_questions` ADD CONSTRAINT `FK_8495fae86f13836b0745642baa8` FOREIGN KEY (`applicationId`) REFERENCES `application`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `application` ADD CONSTRAINT `FK_56f5614fff0028d403704995822` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `application` ADD CONSTRAINT `FK_b4ae3fea4a24b4be1a86dacf8a2` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `application` ADD CONSTRAINT `FK_500cee6f635849f50e19c7e2b76` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `application` ADD CONSTRAINT `FK_7ec2857c7d8d16432ffca1cb3d9` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `application_questions` ADD CONSTRAINT `FK_fe50118fd82e7fe2f74f986a195` FOREIGN KEY (`nvpId`) REFERENCES `nvp`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_deceb07e75a8600e38d5de14a89\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_67663901817dd09d5906537e088\` FOREIGN KEY (\`profileId\`) REFERENCES \`card_profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `user` ADD CONSTRAINT `FK_09f909622aa177a097256b7cc22` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `challenge` ADD CONSTRAINT `FK_178fa41e46fd331f3501a62f6bf` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `hub` ADD CONSTRAINT `FK_17a161eef37c9f07186532ab758` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_22222901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`card_profile\` ADD CONSTRAINT \`FK_22223901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_262ecf3f5d70b82a48336184251\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`library\` ADD CONSTRAINT \`FK_33333901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas_checkout\` ADD CONSTRAINT \`FK_353b042af56f01ce222f08abf49\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `organization_verification` ADD CONSTRAINT `FK_3795f9dd15ef3ef2dd1d27e309c` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );;
      await queryRunner.query(
        `ALTER TABLE \`visual\` ADD CONSTRAINT \`FK_439d0b187986492b58178a82c3f\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_44333901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`aspect_template\` ADD CONSTRAINT \`FK_44446901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas_template\` ADD CONSTRAINT \`FK_45556901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_4555dccdda9ba57d8e3a634cd0d\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`preference\` ADD CONSTRAINT \`FK_49030bc57aa0f319cee7996fca1\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `relation` ADD CONSTRAINT `FK_53fccd56207915b969b91834e04` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `context` ADD CONSTRAINT `FK_5f0dbc3b097ef297bd5f4ddb1a9` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_6289dee12effb51320051c6f1fc\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `ecosystem_model` ADD CONSTRAINT `FK_658580aea4e1a892227e27db902` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`templates_set\` ADD CONSTRAINT \`FK_66666901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `community` ADD CONSTRAINT `FK_6e7584bfb417bd0f8e8696ab585` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `reference` ADD CONSTRAINT `FK_73e8ae665a49366ca7e2866a45d` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`lifecycle_template\` ADD CONSTRAINT \`FK_76546901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`updates\` ADD CONSTRAINT \`FK_77775901817dd09d5906537e087\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`preference_set\` ADD CONSTRAINT \`FK_88885901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`communication\` ADD CONSTRAINT \`FK_a20c5901817dd09d5906537e087\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_a344b754f33792cbbc58e41e898` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `profile` ADD CONSTRAINT `FK_a96475631aba7dce41db03cc8b2` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `organization` ADD CONSTRAINT `FK_badc07674ce4e44801e5a5f36ce` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `user_group` ADD CONSTRAINT `FK_e8e32f1e59c349b406a4752e545` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `tagset` ADD CONSTRAINT `FK_eb59b98ee6ef26c993d0d75c83c` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `project` ADD CONSTRAINT `FK_fac8673f44e6b295e30d1c1739a` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_fcabc1f3aa38aca70df4f66e938\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_9b1c5ee044611ac78249194ec35\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_c506eee0b7d06523b2953d07337\` FOREIGN KEY (\`canvasTemplateId\`) REFERENCES \`canvas_template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`card_profile\` ADD CONSTRAINT \`FK_44443901817dd09d5906537e088\` FOREIGN KEY (\`tagsetId\`) REFERENCES \`tagset\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_0e2c355dbb2950851dbc17a4490` FOREIGN KEY (`challengeId`) REFERENCES `challenge`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `challenge` ADD CONSTRAINT `FK_7d2b222d54b900071b0959f03ef` FOREIGN KEY (`parentChallengeId`) REFERENCES `challenge`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
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
        'ALTER TABLE `challenge` ADD CONSTRAINT `FK_494b27cb13b59128fb24b365ca6` FOREIGN KEY (`parenthubId`) REFERENCES `hub`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_d4551f18fed106ae2e20c70f7cb\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_6325f4ef25c4e07e723a96ed37c\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`relation\` ADD CONSTRAINT \`FK_701a6f8e3e1da76354571767c3f\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_1c7744df92f39ab567084fd8c09` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_fa617e79d6b2926edc7b4a3878f\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `user_group` ADD CONSTRAINT `FK_9fcc131f256e969d773327f07cb` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `hub` ADD CONSTRAINT `FK_f5ad15bcb06a95c2a109fbcce2a` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_35533901817dd09d5906537e088\` FOREIGN KEY (\`policyId\`) REFERENCES \`community_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `reference` ADD CONSTRAINT `FK_07dbf4b02a078a59c216691f5eb` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`reference\` ADD CONSTRAINT \`FK_299938434c7198a323ea6f475fb\` FOREIGN KEY (\`contextRecommendationId\`) REFERENCES \`context\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`visual\` ADD CONSTRAINT \`FK_63de1450cf75dc486700ca034c6\` FOREIGN KEY (\`contextId\`) REFERENCES \`context\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `hub` ADD CONSTRAINT `FK_6db8627abbf00b1b986e359054f` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_9c169eb500e2d3823154c7b603d` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `context` ADD CONSTRAINT `FK_a03169c3f86480ba3863924f4d7` FOREIGN KEY (`ecosystemModelId`) REFERENCES `ecosystem_model`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `hub` ADD CONSTRAINT `FK_ec1a68698d32f610a5fc1880c7f` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `hub` ADD CONSTRAINT `FK_3a69b0a6c67ead7617634009903` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_77777450cf75dc486700ca034c6\` FOREIGN KEY (\`libraryId\`) REFERENCES \`library\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_55555901817dd09d5906537e088\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `organization_verification` ADD CONSTRAINT `FK_22be0d440df7972d9b3a94aa6d5` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_6860f1e3ae5509245bdb5c401f3` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`canvas_checkout\` ADD CONSTRAINT \`FK_bd3c7c6c2dbc2a8daf4b1500a69\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        'ALTER TABLE `project` ADD CONSTRAINT `FK_f425931bb61a95ef6f6d89c9a85` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `project` ADD CONSTRAINT `FK_35e34564793a27bb3c209a15245` FOREIGN KEY (`opportunityId`) REFERENCES `opportunity`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_7d23d17ce61f11c92ff1ea0ed1a` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `user_group` ADD CONSTRAINT `FK_2b8381df8c3a1680f50e4bc2351` FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `organization` ADD CONSTRAINT `FK_037ba4b170844c039e74aa22ecd` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `reference` ADD CONSTRAINT `FK_2f46c698fc4c19a8cc233c5f255` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `tagset` ADD CONSTRAINT `FK_81fc213b2d9ad0cddeab1a9ce64` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `user` ADD CONSTRAINT `FK_9466682df91534dd95e4dbaa616` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `user_group` ADD CONSTRAINT `FK_9912e4cfc1e09848a392a651514` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        'ALTER TABLE `project` ADD CONSTRAINT `FK_d07535c59062f86e887de8f0a57` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
      );
      await queryRunner.query(
        `ALTER TABLE \`reference\` ADD CONSTRAINT \`FK_282838434c7198a323ea6f475fb\` FOREIGN KEY (\`cardProfileId\`) REFERENCES \`card_profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE \`template_info\` ADD CONSTRAINT \`FK_77777901817dd09d5906537e088\` FOREIGN KEY (\`tagsetId\`) REFERENCES \`tagset\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
      );
    }

}

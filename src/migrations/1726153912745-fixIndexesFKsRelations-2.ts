import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixIndexesFKsRelations21726153912745
  implements MigrationInterface
{
  name = 'FixIndexesFKsRelations21726153912745';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `IDX_eb59b98ee6ef26c993d0d75c83` ON `tagset`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_4fbd109f9bb84f58b7a3c60649` ON `visual`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_9fb9257b14ec21daf5bc9aa4c8` ON `document`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_d9e2dfcccf59233c17cc6bc641` ON `document`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_0647707288c243e60091c8d862` ON `storage_aggregator`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_f3b4d59c0b805c9c1ecb0070e1` ON `storage_aggregator`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_f2f48b57269987b13b415a0058` ON `storage_bucket`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_432056041df0e4337b17ff7b09` ON `profile`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_4a1c74fd2a61b32d9d9500e065` ON `profile`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_a96475631aba7dce41db03cc8b` ON `profile`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_73e8ae665a49366ca7e2866a45` ON `reference`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_d1d94dd8e0c417b4188a05ccbc` ON `room`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_3f9e9e2798d2a4d84b16ee8477` ON `whiteboard`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_d3b86160bb7d704212382b0ca4` ON `whiteboard`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_8bc0e1f40be5816d3a593cbf7f` ON `callout_framing`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_c9d7c2c4eb8a1d012ddc6605da` ON `callout_framing`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_f53e2d266432e58e538a366705` ON `callout_framing`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_042b9825d770d6b3009ae206c2` ON `post`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_390343b22abec869bf80041933` ON `post`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_970844fcd10c2b6df7c1b49eac` ON `post`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_07f249ac87502495710a62c5c0` ON `link`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_3bfc8c1aaec1395cc148268d3c` ON `link`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_5e34f9a356f6254b8da24f8947` ON `callout_contribution`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_97fefc97fb254c30577696e1c0` ON `callout_contribution`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_bdf2d0eced5c95968a85caaaae` ON `callout_contribution`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_dfa86c46f509a61c6510536cd9` ON `callout_contribution`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_1e740008a7e1512966e3b08414` ON `callout`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_36b0da55acff774d0845aeb55f` ON `callout`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_6289dee12effb51320051c6f1f` ON `callout`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_62ed316cda7b75735b20307b47` ON `callout`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_cf776244b01436d8ca5cc76284` ON `callout`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_8ee86afa2808a4ab523b9ee6c5` ON `calendar_event`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_9349e137959f3ca5818c2e62b3` ON `calendar_event`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_b5069b11030e9608ee4468f850` ON `calendar_event`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_6e74d59afda096b68d12a69969` ON `calendar`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_56aae15a664b2889a1a11c2cf8` ON `timeline`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_5fe58ece01b48496aebc04733d` ON `timeline`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_96a8cbe1706f459fd7d883be9b` ON `innovation_flow`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_a6e050daa4c7a3ab1e411c3651` ON `innovation_flow`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_262ecf3f5d70b82a4833618425` ON `collaboration`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_35c6b1de6d4d89dfe8e9c85d77` ON `collaboration`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_b7ece56376ac7ca0b9a56c33b3` ON `collaboration`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_f67a2d25c945269d602c182fbc` ON `collaboration`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_1cc3b275fc2a9d9d9b0ae33b31` ON `organization_verification`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_c66eddab0caacb1ef8d46bcafd` ON `organization_verification`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_b4cf0f96bf08cf396f68355522` ON `preference`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_8e76dcf171c45875c44febb1d8` ON `preference_set`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_8ed9d1af584fa62f1ad3405b33` ON `agent`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_395aa74996a1f978b4969d114b` ON `organization`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_58fd47c4a6ac8df9fe2bcaed87` ON `organization`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_5a72d5b37312bac2e0a0115718` ON `organization`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_7f1bec8979b57ed7ebd392a2ca` ON `organization`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_d2cb77c14644156ec8e865608e` ON `organization`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_e0e150e4f11d906b931b46a2d8` ON `organization`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_9912e4cfc1e09848a392a65151` ON `user_group`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_e8e32f1e59c349b406a4752e54` ON `user_group`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_028322b763dc94242dc9f638f9` ON `user`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_09f909622aa177a097256b7cc2` ON `user`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_10458c50c10436b6d589b40e5c` ON `user`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_9466682df91534dd95e4dbaa61` ON `user`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_b61c694cacfab25533bd23d9ad` ON `user`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_56f5614fff0028d40370499582` ON `application`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_7ec2857c7d8d16432ffca1cb3d` ON `application`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_a20c5901817dd09d5906537e08` ON `communication`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_eb99e588873c788a68a035478a` ON `communication`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_b0c80ccf319a1c7a7af12b3998` ON `invitation`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_b132226941570cb650a4023d49` ON `invitation`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_3d60fe4fa40d54bad7d51bb4bd` ON `community_guidelines`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_684b272e6f7459439d41d2879e` ON `community_guidelines`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_3879db652f2421337691219ace` ON `library`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_23d4d78ea8db637df031f86f03` ON `license_policy`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_0c6a4d0a6c13a3f5df6ac01509` ON `licensing`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_a5dae5a376dd49c7c076893d40` ON `licensing`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_2d8a3ca181c3f0346817685d21` ON `discussion`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_4555dccdda9ba57d8e3a634cd0` ON `discussion`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_5337074c9b818bb63e6f314c80` ON `discussion`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_3b0c92945f36d06f37de80285d` ON `forum`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_425bbb4b951f7f4629710763fc` ON `platform`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_9f621c51dd854634d8766a9cfa` ON `platform`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_ca469f5ec53a7719d155d60aca` ON `platform`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_dd88d373c64b04e24705d575c9` ON `platform`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_f516dd9a46616999c7e9a6adc1` ON `platform`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_c0448d2c992a62c9c11bd0f142` ON `platform_invitation`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_2e7dd2fa8c829352cfbecb2cc9` ON `community`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_3823de95920943655430125fa9` ON `community`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_6e7584bfb417bd0f8e8696ab58` ON `community`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_7fbe50fa78a37776ad962cb764` ON `community`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_c7d74dd6b92d4202c705cd3676` ON `community`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_a2afa3851ea733de932251b3a1` ON `actor`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_bde98d59e8984e7d17034c3b93` ON `actor_group`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_658580aea4e1a892227e27db90` ON `ecosystem_model`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_5f0dbc3b097ef297bd5f4ddb1a` ON `context`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_a03169c3f86480ba3863924f4d` ON `context`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_4a9c8cefc6c7e33aa728d22a90` ON `post_template`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_c3bdb693adb031b6613edcef4f` ON `post_template`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_5b4948db27c348e65055187d5e` ON `whiteboard_template`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_cc2faf30ce52648db9299d7072` ON `whiteboard_template`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_3aec561629db1d65a9b2b3a788` ON `innovation_flow_template`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_bd591d7403dabe091f6a116975` ON `innovation_flow_template`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_29ff764dc6de1a9dc289cbfb01` ON `callout_template`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_479f799f0d86e43c9d8623e827` ON `callout_template`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_6c90723f8f1424e2dd08dddb39` ON `callout_template`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_75d5ced6c2e92cbbb5d8d0a913` ON `callout_template`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_b94beb9cefe0a8814dceddd10f` ON `callout_template`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_25dbe2675edea7b3c4f4aec430` ON `community_guidelines_template`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_e1817f55e97bba03a57b928725` ON `community_guidelines_template`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_eb3f02cf18df8943da1673a25b` ON `community_guidelines_template`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_eb0176ef4b98c143322aa6f809` ON `templates_set`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_413ba75964e5a534e4bfa54846` ON `space_defaults`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_592a23e68922853bae6ebecd85` ON `space_defaults`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_43559aeadc1a5169d17e81b3d4` ON `space`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_68fa2c2b00cc1ed77e7c225e8b` ON `space`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_6b1efee39d076d9f7ecb8fef4c` ON `space`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_8d03fd2c8e8411ec9192c79cd9` ON `space`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_980c4643d7d9de1b97bc39f518` ON `space`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_9c664d684f987a735678b0ba82` ON `space`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_b4250035291aac1329d59224a9` ON `space`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_cc0b08eb9679d3daa95153c2af` ON `space`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_ea06eb8894469a0f262d929bf0` ON `space`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_293f0d3ef60cb0ca0006044ecf` ON `ai_persona`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_4504c37764f6962ccbd165a21d` ON `virtual_contributor`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_55b8101bdf4f566645e928c26e` ON `virtual_contributor`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_a8890dcd65b8c3ee6e160d33f3` ON `virtual_contributor`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_e2eaa2213ac4454039cd8abc07` ON `virtual_contributor`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_5facd6d188068a5a1c5b6f07fc` ON `innovation_pack`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_8af8122897b05315e7eb892525` ON `innovation_pack`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_a1441e46c8d36090e1f6477cea` ON `innovation_pack`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_833582df0c439ab8c9adc5240d` ON `account`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_91a165c1091a6959cc19d52239` ON `account`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_950221e932175dc7cf7c006488` ON `account`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_36c8905c2c6c59467c60d94fd8` ON `innovation_hub`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_b411e4f27d77a96eccdabbf4b4` ON `innovation_hub`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_0f03c61020ea0dfa0198c60304` ON `activity`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_79206feb0038b1c5597668dc4b` ON `ai_persona_service`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_9d520fa5fed56042918e48fc4b` ON `ai_server`'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_9d520fa5fed56042918e48fc4b` ON `ai_server` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_79206feb0038b1c5597668dc4b` ON `ai_persona_service` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_0f03c61020ea0dfa0198c60304` ON `activity` (`rowId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_b411e4f27d77a96eccdabbf4b4` ON `innovation_hub` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_36c8905c2c6c59467c60d94fd8` ON `innovation_hub` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_950221e932175dc7cf7c006488` ON `account` (`storageAggregatorId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_91a165c1091a6959cc19d52239` ON `account` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_833582df0c439ab8c9adc5240d` ON `account` (`agentId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_a1441e46c8d36090e1f6477cea` ON `innovation_pack` (`templatesSetId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_8af8122897b05315e7eb892525` ON `innovation_pack` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_5facd6d188068a5a1c5b6f07fc` ON `innovation_pack` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_e2eaa2213ac4454039cd8abc07` ON `virtual_contributor` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_a8890dcd65b8c3ee6e160d33f3` ON `virtual_contributor` (`agentId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_55b8101bdf4f566645e928c26e` ON `virtual_contributor` (`aiPersonaId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_4504c37764f6962ccbd165a21d` ON `virtual_contributor` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_293f0d3ef60cb0ca0006044ecf` ON `ai_persona` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_ea06eb8894469a0f262d929bf0` ON `space` (`collaborationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_cc0b08eb9679d3daa95153c2af` ON `space` (`contextId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_b4250035291aac1329d59224a9` ON `space` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_9c664d684f987a735678b0ba82` ON `space` (`agentId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_980c4643d7d9de1b97bc39f518` ON `space` (`storageAggregatorId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_8d03fd2c8e8411ec9192c79cd9` ON `space` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_6b1efee39d076d9f7ecb8fef4c` ON `space` (`defaultsId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_68fa2c2b00cc1ed77e7c225e8b` ON `space` (`communityId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_43559aeadc1a5169d17e81b3d4` ON `space` (`libraryId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_592a23e68922853bae6ebecd85` ON `space_defaults` (`innovationFlowTemplateId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_413ba75964e5a534e4bfa54846` ON `space_defaults` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_eb0176ef4b98c143322aa6f809` ON `templates_set` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_eb3f02cf18df8943da1673a25b` ON `community_guidelines_template` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_e1817f55e97bba03a57b928725` ON `community_guidelines_template` (`guidelinesId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_25dbe2675edea7b3c4f4aec430` ON `community_guidelines_template` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_b94beb9cefe0a8814dceddd10f` ON `callout_template` (`framingId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_75d5ced6c2e92cbbb5d8d0a913` ON `callout_template` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_6c90723f8f1424e2dd08dddb39` ON `callout_template` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_479f799f0d86e43c9d8623e827` ON `callout_template` (`contributionDefaultsId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_29ff764dc6de1a9dc289cbfb01` ON `callout_template` (`contributionPolicyId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_bd591d7403dabe091f6a116975` ON `innovation_flow_template` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_3aec561629db1d65a9b2b3a788` ON `innovation_flow_template` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_cc2faf30ce52648db9299d7072` ON `whiteboard_template` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_5b4948db27c348e65055187d5e` ON `whiteboard_template` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_c3bdb693adb031b6613edcef4f` ON `post_template` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_4a9c8cefc6c7e33aa728d22a90` ON `post_template` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_a03169c3f86480ba3863924f4d` ON `context` (`ecosystemModelId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_5f0dbc3b097ef297bd5f4ddb1a` ON `context` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_658580aea4e1a892227e27db90` ON `ecosystem_model` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_bde98d59e8984e7d17034c3b93` ON `actor_group` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_a2afa3851ea733de932251b3a1` ON `actor` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_c7d74dd6b92d4202c705cd3676` ON `community` (`applicationFormId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_7fbe50fa78a37776ad962cb764` ON `community` (`communicationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_6e7584bfb417bd0f8e8696ab58` ON `community` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_3823de95920943655430125fa9` ON `community` (`policyId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_2e7dd2fa8c829352cfbecb2cc9` ON `community` (`guidelinesId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_c0448d2c992a62c9c11bd0f142` ON `platform_invitation` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_f516dd9a46616999c7e9a6adc1` ON `platform` (`storageAggregatorId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_dd88d373c64b04e24705d575c9` ON `platform` (`forumId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_ca469f5ec53a7719d155d60aca` ON `platform` (`libraryId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_9f621c51dd854634d8766a9cfa` ON `platform` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_425bbb4b951f7f4629710763fc` ON `platform` (`licensingId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_3b0c92945f36d06f37de80285d` ON `forum` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_5337074c9b818bb63e6f314c80` ON `discussion` (`commentsId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_4555dccdda9ba57d8e3a634cd0` ON `discussion` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_2d8a3ca181c3f0346817685d21` ON `discussion` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_a5dae5a376dd49c7c076893d40` ON `licensing` (`licensePolicyId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_0c6a4d0a6c13a3f5df6ac01509` ON `licensing` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_23d4d78ea8db637df031f86f03` ON `license_policy` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_3879db652f2421337691219ace` ON `library` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_684b272e6f7459439d41d2879e` ON `community_guidelines` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_3d60fe4fa40d54bad7d51bb4bd` ON `community_guidelines` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_b132226941570cb650a4023d49` ON `invitation` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_b0c80ccf319a1c7a7af12b3998` ON `invitation` (`lifecycleId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_eb99e588873c788a68a035478a` ON `communication` (`updatesId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_a20c5901817dd09d5906537e08` ON `communication` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_7ec2857c7d8d16432ffca1cb3d` ON `application` (`lifecycleId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_56f5614fff0028d40370499582` ON `application` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_b61c694cacfab25533bd23d9ad` ON `user` (`agentId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_9466682df91534dd95e4dbaa61` ON `user` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_10458c50c10436b6d589b40e5c` ON `user` (`storageAggregatorId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_09f909622aa177a097256b7cc2` ON `user` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_028322b763dc94242dc9f638f9` ON `user` (`preferenceSetId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_e8e32f1e59c349b406a4752e54` ON `user_group` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_9912e4cfc1e09848a392a65151` ON `user_group` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_e0e150e4f11d906b931b46a2d8` ON `organization` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_d2cb77c14644156ec8e865608e` ON `organization` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_7f1bec8979b57ed7ebd392a2ca` ON `organization` (`agentId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_5a72d5b37312bac2e0a0115718` ON `organization` (`verificationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_58fd47c4a6ac8df9fe2bcaed87` ON `organization` (`preferenceSetId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_395aa74996a1f978b4969d114b` ON `organization` (`storageAggregatorId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_8ed9d1af584fa62f1ad3405b33` ON `agent` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_8e76dcf171c45875c44febb1d8` ON `preference_set` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_b4cf0f96bf08cf396f68355522` ON `preference` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_c66eddab0caacb1ef8d46bcafd` ON `organization_verification` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_1cc3b275fc2a9d9d9b0ae33b31` ON `organization_verification` (`lifecycleId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_f67a2d25c945269d602c182fbc` ON `collaboration` (`timelineId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_b7ece56376ac7ca0b9a56c33b3` ON `collaboration` (`tagsetTemplateSetId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_35c6b1de6d4d89dfe8e9c85d77` ON `collaboration` (`innovationFlowId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_262ecf3f5d70b82a4833618425` ON `collaboration` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_a6e050daa4c7a3ab1e411c3651` ON `innovation_flow` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_96a8cbe1706f459fd7d883be9b` ON `innovation_flow` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_5fe58ece01b48496aebc04733d` ON `timeline` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_56aae15a664b2889a1a11c2cf8` ON `timeline` (`calendarId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_6e74d59afda096b68d12a69969` ON `calendar` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_b5069b11030e9608ee4468f850` ON `calendar_event` (`commentsId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_9349e137959f3ca5818c2e62b3` ON `calendar_event` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_8ee86afa2808a4ab523b9ee6c5` ON `calendar_event` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_cf776244b01436d8ca5cc76284` ON `callout` (`framingId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_62ed316cda7b75735b20307b47` ON `callout` (`commentsId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_6289dee12effb51320051c6f1f` ON `callout` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_36b0da55acff774d0845aeb55f` ON `callout` (`contributionDefaultsId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_1e740008a7e1512966e3b08414` ON `callout` (`contributionPolicyId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_dfa86c46f509a61c6510536cd9` ON `callout_contribution` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_bdf2d0eced5c95968a85caaaae` ON `callout_contribution` (`linkId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_97fefc97fb254c30577696e1c0` ON `callout_contribution` (`postId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_5e34f9a356f6254b8da24f8947` ON `callout_contribution` (`whiteboardId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_3bfc8c1aaec1395cc148268d3c` ON `link` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_07f249ac87502495710a62c5c0` ON `link` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_970844fcd10c2b6df7c1b49eac` ON `post` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_390343b22abec869bf80041933` ON `post` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_042b9825d770d6b3009ae206c2` ON `post` (`commentsId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_f53e2d266432e58e538a366705` ON `callout_framing` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_c9d7c2c4eb8a1d012ddc6605da` ON `callout_framing` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_8bc0e1f40be5816d3a593cbf7f` ON `callout_framing` (`whiteboardId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_d3b86160bb7d704212382b0ca4` ON `whiteboard` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_3f9e9e2798d2a4d84b16ee8477` ON `whiteboard` (`profileId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_d1d94dd8e0c417b4188a05ccbc` ON `room` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_73e8ae665a49366ca7e2866a45` ON `reference` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_a96475631aba7dce41db03cc8b` ON `profile` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_4a1c74fd2a61b32d9d9500e065` ON `profile` (`storageBucketId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_432056041df0e4337b17ff7b09` ON `profile` (`locationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_f2f48b57269987b13b415a0058` ON `storage_bucket` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_f3b4d59c0b805c9c1ecb0070e1` ON `storage_aggregator` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_0647707288c243e60091c8d862` ON `storage_aggregator` (`directStorageId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_d9e2dfcccf59233c17cc6bc641` ON `document` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_9fb9257b14ec21daf5bc9aa4c8` ON `document` (`tagsetId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_4fbd109f9bb84f58b7a3c60649` ON `visual` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_eb59b98ee6ef26c993d0d75c83` ON `tagset` (`authorizationId`)'
    );
  }
}

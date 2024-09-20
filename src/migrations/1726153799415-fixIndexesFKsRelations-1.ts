import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixIndexesFKsRelations1726153799415 implements MigrationInterface {
  name = 'FixIndexesFKsRelations1726153799415';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`tagset\` ADD UNIQUE INDEX \`IDX_eb59b98ee6ef26c993d0d75c83\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD UNIQUE INDEX \`IDX_4fbd109f9bb84f58b7a3c60649\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD UNIQUE INDEX \`IDX_d9e2dfcccf59233c17cc6bc641\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD UNIQUE INDEX \`IDX_9fb9257b14ec21daf5bc9aa4c8\` (\`tagsetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_aggregator\` ADD UNIQUE INDEX \`IDX_f3b4d59c0b805c9c1ecb0070e1\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_aggregator\` ADD UNIQUE INDEX \`IDX_0647707288c243e60091c8d862\` (\`directStorageId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` ADD UNIQUE INDEX \`IDX_f2f48b57269987b13b415a0058\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD UNIQUE INDEX \`IDX_a96475631aba7dce41db03cc8b\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD UNIQUE INDEX \`IDX_432056041df0e4337b17ff7b09\` (\`locationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD UNIQUE INDEX \`IDX_4a1c74fd2a61b32d9d9500e065\` (\`storageBucketId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD UNIQUE INDEX \`IDX_73e8ae665a49366ca7e2866a45\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` ADD UNIQUE INDEX \`IDX_d1d94dd8e0c417b4188a05ccbc\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD UNIQUE INDEX \`IDX_d3b86160bb7d704212382b0ca4\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD UNIQUE INDEX \`IDX_3f9e9e2798d2a4d84b16ee8477\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD UNIQUE INDEX \`IDX_c9d7c2c4eb8a1d012ddc6605da\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD UNIQUE INDEX \`IDX_f53e2d266432e58e538a366705\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD UNIQUE INDEX \`IDX_8bc0e1f40be5816d3a593cbf7f\` (\`whiteboardId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD UNIQUE INDEX \`IDX_390343b22abec869bf80041933\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD UNIQUE INDEX \`IDX_970844fcd10c2b6df7c1b49eac\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD UNIQUE INDEX \`IDX_042b9825d770d6b3009ae206c2\` (\`commentsId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`link\` ADD UNIQUE INDEX \`IDX_07f249ac87502495710a62c5c0\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`link\` ADD UNIQUE INDEX \`IDX_3bfc8c1aaec1395cc148268d3c\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD UNIQUE INDEX \`IDX_dfa86c46f509a61c6510536cd9\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD UNIQUE INDEX \`IDX_5e34f9a356f6254b8da24f8947\` (\`whiteboardId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD UNIQUE INDEX \`IDX_97fefc97fb254c30577696e1c0\` (\`postId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD UNIQUE INDEX \`IDX_bdf2d0eced5c95968a85caaaae\` (\`linkId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD UNIQUE INDEX \`IDX_6289dee12effb51320051c6f1f\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD UNIQUE INDEX \`IDX_cf776244b01436d8ca5cc76284\` (\`framingId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD UNIQUE INDEX \`IDX_1e740008a7e1512966e3b08414\` (\`contributionPolicyId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD UNIQUE INDEX \`IDX_36b0da55acff774d0845aeb55f\` (\`contributionDefaultsId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD UNIQUE INDEX \`IDX_62ed316cda7b75735b20307b47\` (\`commentsId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD UNIQUE INDEX \`IDX_8ee86afa2808a4ab523b9ee6c5\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD UNIQUE INDEX \`IDX_9349e137959f3ca5818c2e62b3\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD UNIQUE INDEX \`IDX_b5069b11030e9608ee4468f850\` (\`commentsId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar\` ADD UNIQUE INDEX \`IDX_6e74d59afda096b68d12a69969\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` ADD UNIQUE INDEX \`IDX_5fe58ece01b48496aebc04733d\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` ADD UNIQUE INDEX \`IDX_56aae15a664b2889a1a11c2cf8\` (\`calendarId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD UNIQUE INDEX \`IDX_a6e050daa4c7a3ab1e411c3651\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD UNIQUE INDEX \`IDX_96a8cbe1706f459fd7d883be9b\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD UNIQUE INDEX \`IDX_262ecf3f5d70b82a4833618425\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD UNIQUE INDEX \`IDX_b7ece56376ac7ca0b9a56c33b3\` (\`tagsetTemplateSetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD UNIQUE INDEX \`IDX_f67a2d25c945269d602c182fbc\` (\`timelineId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD UNIQUE INDEX \`IDX_35c6b1de6d4d89dfe8e9c85d77\` (\`innovationFlowId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` ADD UNIQUE INDEX \`IDX_c66eddab0caacb1ef8d46bcafd\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` ADD UNIQUE INDEX \`IDX_1cc3b275fc2a9d9d9b0ae33b31\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD UNIQUE INDEX \`IDX_b4cf0f96bf08cf396f68355522\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_set\` ADD UNIQUE INDEX \`IDX_8e76dcf171c45875c44febb1d8\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` ADD UNIQUE INDEX \`IDX_8ed9d1af584fa62f1ad3405b33\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD UNIQUE INDEX \`IDX_e0e150e4f11d906b931b46a2d8\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD UNIQUE INDEX \`IDX_d2cb77c14644156ec8e865608e\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD UNIQUE INDEX \`IDX_7f1bec8979b57ed7ebd392a2ca\` (\`agentId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD UNIQUE INDEX \`IDX_5a72d5b37312bac2e0a0115718\` (\`verificationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD UNIQUE INDEX \`IDX_58fd47c4a6ac8df9fe2bcaed87\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD UNIQUE INDEX \`IDX_395aa74996a1f978b4969d114b\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD UNIQUE INDEX \`IDX_e8e32f1e59c349b406a4752e54\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD UNIQUE INDEX \`IDX_9912e4cfc1e09848a392a65151\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_09f909622aa177a097256b7cc2\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_9466682df91534dd95e4dbaa61\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_b61c694cacfab25533bd23d9ad\` (\`agentId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_028322b763dc94242dc9f638f9\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_10458c50c10436b6d589b40e5c\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD UNIQUE INDEX \`IDX_56f5614fff0028d40370499582\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD UNIQUE INDEX \`IDX_7ec2857c7d8d16432ffca1cb3d\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD UNIQUE INDEX \`IDX_a20c5901817dd09d5906537e08\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD UNIQUE INDEX \`IDX_eb99e588873c788a68a035478a\` (\`updatesId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD UNIQUE INDEX \`IDX_b132226941570cb650a4023d49\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD UNIQUE INDEX \`IDX_b0c80ccf319a1c7a7af12b3998\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines\` ADD UNIQUE INDEX \`IDX_684b272e6f7459439d41d2879e\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines\` ADD UNIQUE INDEX \`IDX_3d60fe4fa40d54bad7d51bb4bd\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`library\` ADD UNIQUE INDEX \`IDX_3879db652f2421337691219ace\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_policy\` ADD UNIQUE INDEX \`IDX_23d4d78ea8db637df031f86f03\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing\` ADD UNIQUE INDEX \`IDX_0c6a4d0a6c13a3f5df6ac01509\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing\` ADD UNIQUE INDEX \`IDX_a5dae5a376dd49c7c076893d40\` (\`licensePolicyId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD UNIQUE INDEX \`IDX_4555dccdda9ba57d8e3a634cd0\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD UNIQUE INDEX \`IDX_2d8a3ca181c3f0346817685d21\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD UNIQUE INDEX \`IDX_5337074c9b818bb63e6f314c80\` (\`commentsId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`forum\` ADD UNIQUE INDEX \`IDX_3b0c92945f36d06f37de80285d\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD UNIQUE INDEX \`IDX_9f621c51dd854634d8766a9cfa\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD UNIQUE INDEX \`IDX_dd88d373c64b04e24705d575c9\` (\`forumId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD UNIQUE INDEX \`IDX_ca469f5ec53a7719d155d60aca\` (\`libraryId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD UNIQUE INDEX \`IDX_f516dd9a46616999c7e9a6adc1\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD UNIQUE INDEX \`IDX_425bbb4b951f7f4629710763fc\` (\`licensingId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` ADD UNIQUE INDEX \`IDX_c0448d2c992a62c9c11bd0f142\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD UNIQUE INDEX \`IDX_6e7584bfb417bd0f8e8696ab58\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD UNIQUE INDEX \`IDX_7fbe50fa78a37776ad962cb764\` (\`communicationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD UNIQUE INDEX \`IDX_2e7dd2fa8c829352cfbecb2cc9\` (\`guidelinesId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD UNIQUE INDEX \`IDX_c7d74dd6b92d4202c705cd3676\` (\`applicationFormId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD UNIQUE INDEX \`IDX_3823de95920943655430125fa9\` (\`policyId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` ADD UNIQUE INDEX \`IDX_a2afa3851ea733de932251b3a1\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` ADD UNIQUE INDEX \`IDX_bde98d59e8984e7d17034c3b93\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` ADD UNIQUE INDEX \`IDX_658580aea4e1a892227e27db90\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD UNIQUE INDEX \`IDX_5f0dbc3b097ef297bd5f4ddb1a\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD UNIQUE INDEX \`IDX_a03169c3f86480ba3863924f4d\` (\`ecosystemModelId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD UNIQUE INDEX \`IDX_c3bdb693adb031b6613edcef4f\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD UNIQUE INDEX \`IDX_4a9c8cefc6c7e33aa728d22a90\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD UNIQUE INDEX \`IDX_cc2faf30ce52648db9299d7072\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD UNIQUE INDEX \`IDX_5b4948db27c348e65055187d5e\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD UNIQUE INDEX \`IDX_3aec561629db1d65a9b2b3a788\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD UNIQUE INDEX \`IDX_bd591d7403dabe091f6a116975\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD UNIQUE INDEX \`IDX_6c90723f8f1424e2dd08dddb39\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD UNIQUE INDEX \`IDX_75d5ced6c2e92cbbb5d8d0a913\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD UNIQUE INDEX \`IDX_b94beb9cefe0a8814dceddd10f\` (\`framingId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD UNIQUE INDEX \`IDX_479f799f0d86e43c9d8623e827\` (\`contributionDefaultsId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD UNIQUE INDEX \`IDX_29ff764dc6de1a9dc289cbfb01\` (\`contributionPolicyId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines_template\` ADD UNIQUE INDEX \`IDX_eb3f02cf18df8943da1673a25b\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines_template\` ADD UNIQUE INDEX \`IDX_25dbe2675edea7b3c4f4aec430\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines_template\` ADD UNIQUE INDEX \`IDX_e1817f55e97bba03a57b928725\` (\`guidelinesId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` ADD UNIQUE INDEX \`IDX_eb0176ef4b98c143322aa6f809\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` ADD UNIQUE INDEX \`IDX_413ba75964e5a534e4bfa54846\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` ADD UNIQUE INDEX \`IDX_592a23e68922853bae6ebecd85\` (\`innovationFlowTemplateId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD UNIQUE INDEX \`IDX_8d03fd2c8e8411ec9192c79cd9\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD UNIQUE INDEX \`IDX_b4250035291aac1329d59224a9\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD UNIQUE INDEX \`IDX_ea06eb8894469a0f262d929bf0\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD UNIQUE INDEX \`IDX_cc0b08eb9679d3daa95153c2af\` (\`contextId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD UNIQUE INDEX \`IDX_68fa2c2b00cc1ed77e7c225e8b\` (\`communityId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD UNIQUE INDEX \`IDX_9c664d684f987a735678b0ba82\` (\`agentId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD UNIQUE INDEX \`IDX_980c4643d7d9de1b97bc39f518\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD UNIQUE INDEX \`IDX_43559aeadc1a5169d17e81b3d4\` (\`libraryId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD UNIQUE INDEX \`IDX_6b1efee39d076d9f7ecb8fef4c\` (\`defaultsId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` ADD UNIQUE INDEX \`IDX_293f0d3ef60cb0ca0006044ecf\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD UNIQUE INDEX \`IDX_e2eaa2213ac4454039cd8abc07\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD UNIQUE INDEX \`IDX_4504c37764f6962ccbd165a21d\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD UNIQUE INDEX \`IDX_a8890dcd65b8c3ee6e160d33f3\` (\`agentId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD UNIQUE INDEX \`IDX_55b8101bdf4f566645e928c26e\` (\`aiPersonaId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD UNIQUE INDEX \`IDX_8af8122897b05315e7eb892525\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD UNIQUE INDEX \`IDX_5facd6d188068a5a1c5b6f07fc\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD UNIQUE INDEX \`IDX_a1441e46c8d36090e1f6477cea\` (\`templatesSetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` ADD UNIQUE INDEX \`IDX_91a165c1091a6959cc19d52239\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` ADD UNIQUE INDEX \`IDX_833582df0c439ab8c9adc5240d\` (\`agentId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` ADD UNIQUE INDEX \`IDX_950221e932175dc7cf7c006488\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD UNIQUE INDEX \`IDX_1d39dac2c6d2f17286d90c306b\` (\`nameID\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD UNIQUE INDEX \`IDX_8f35d04d098bb6c7c57a9a83ac\` (\`subdomain\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD UNIQUE INDEX \`IDX_b411e4f27d77a96eccdabbf4b4\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD UNIQUE INDEX \`IDX_36c8905c2c6c59467c60d94fd8\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`activity\` ADD UNIQUE INDEX \`IDX_07a39cea9426b689be25fd61de\` (\`rowId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_server\` ADD UNIQUE INDEX \`IDX_9d520fa5fed56042918e48fc4b\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona_service\` ADD UNIQUE INDEX \`IDX_79206feb0038b1c5597668dc4b\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_eb59b98ee6ef26c993d0d75c83\` ON \`tagset\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_4fbd109f9bb84f58b7a3c60649\` ON \`visual\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_d9e2dfcccf59233c17cc6bc641\` ON \`document\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_9fb9257b14ec21daf5bc9aa4c8\` ON \`document\` (\`tagsetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_f3b4d59c0b805c9c1ecb0070e1\` ON \`storage_aggregator\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_0647707288c243e60091c8d862\` ON \`storage_aggregator\` (\`directStorageId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_f2f48b57269987b13b415a0058\` ON \`storage_bucket\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a96475631aba7dce41db03cc8b\` ON \`profile\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_432056041df0e4337b17ff7b09\` ON \`profile\` (\`locationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_4a1c74fd2a61b32d9d9500e065\` ON \`profile\` (\`storageBucketId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_73e8ae665a49366ca7e2866a45\` ON \`reference\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_d1d94dd8e0c417b4188a05ccbc\` ON \`room\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_d3b86160bb7d704212382b0ca4\` ON \`whiteboard\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_3f9e9e2798d2a4d84b16ee8477\` ON \`whiteboard\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c9d7c2c4eb8a1d012ddc6605da\` ON \`callout_framing\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_f53e2d266432e58e538a366705\` ON \`callout_framing\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_8bc0e1f40be5816d3a593cbf7f\` ON \`callout_framing\` (\`whiteboardId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_390343b22abec869bf80041933\` ON \`post\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_970844fcd10c2b6df7c1b49eac\` ON \`post\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_042b9825d770d6b3009ae206c2\` ON \`post\` (\`commentsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_07f249ac87502495710a62c5c0\` ON \`link\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_3bfc8c1aaec1395cc148268d3c\` ON \`link\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_dfa86c46f509a61c6510536cd9\` ON \`callout_contribution\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_5e34f9a356f6254b8da24f8947\` ON \`callout_contribution\` (\`whiteboardId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_97fefc97fb254c30577696e1c0\` ON \`callout_contribution\` (\`postId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_bdf2d0eced5c95968a85caaaae\` ON \`callout_contribution\` (\`linkId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_6289dee12effb51320051c6f1f\` ON \`callout\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_cf776244b01436d8ca5cc76284\` ON \`callout\` (\`framingId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_1e740008a7e1512966e3b08414\` ON \`callout\` (\`contributionPolicyId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_36b0da55acff774d0845aeb55f\` ON \`callout\` (\`contributionDefaultsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_62ed316cda7b75735b20307b47\` ON \`callout\` (\`commentsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_8ee86afa2808a4ab523b9ee6c5\` ON \`calendar_event\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_9349e137959f3ca5818c2e62b3\` ON \`calendar_event\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_b5069b11030e9608ee4468f850\` ON \`calendar_event\` (\`commentsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_6e74d59afda096b68d12a69969\` ON \`calendar\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_5fe58ece01b48496aebc04733d\` ON \`timeline\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_56aae15a664b2889a1a11c2cf8\` ON \`timeline\` (\`calendarId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a6e050daa4c7a3ab1e411c3651\` ON \`innovation_flow\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_96a8cbe1706f459fd7d883be9b\` ON \`innovation_flow\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_262ecf3f5d70b82a4833618425\` ON \`collaboration\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_b7ece56376ac7ca0b9a56c33b3\` ON \`collaboration\` (\`tagsetTemplateSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_f67a2d25c945269d602c182fbc\` ON \`collaboration\` (\`timelineId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_35c6b1de6d4d89dfe8e9c85d77\` ON \`collaboration\` (\`innovationFlowId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c66eddab0caacb1ef8d46bcafd\` ON \`organization_verification\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_1cc3b275fc2a9d9d9b0ae33b31\` ON \`organization_verification\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_b4cf0f96bf08cf396f68355522\` ON \`preference\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_8e76dcf171c45875c44febb1d8\` ON \`preference_set\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_8ed9d1af584fa62f1ad3405b33\` ON \`agent\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_e0e150e4f11d906b931b46a2d8\` ON \`organization\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_d2cb77c14644156ec8e865608e\` ON \`organization\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_7f1bec8979b57ed7ebd392a2ca\` ON \`organization\` (\`agentId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_5a72d5b37312bac2e0a0115718\` ON \`organization\` (\`verificationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_58fd47c4a6ac8df9fe2bcaed87\` ON \`organization\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_395aa74996a1f978b4969d114b\` ON \`organization\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_e8e32f1e59c349b406a4752e54\` ON \`user_group\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_9912e4cfc1e09848a392a65151\` ON \`user_group\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_09f909622aa177a097256b7cc2\` ON \`user\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_9466682df91534dd95e4dbaa61\` ON \`user\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_b61c694cacfab25533bd23d9ad\` ON \`user\` (\`agentId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_028322b763dc94242dc9f638f9\` ON \`user\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_10458c50c10436b6d589b40e5c\` ON \`user\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_56f5614fff0028d40370499582\` ON \`application\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_7ec2857c7d8d16432ffca1cb3d\` ON \`application\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a20c5901817dd09d5906537e08\` ON \`communication\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_eb99e588873c788a68a035478a\` ON \`communication\` (\`updatesId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_b132226941570cb650a4023d49\` ON \`invitation\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_b0c80ccf319a1c7a7af12b3998\` ON \`invitation\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_684b272e6f7459439d41d2879e\` ON \`community_guidelines\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_3d60fe4fa40d54bad7d51bb4bd\` ON \`community_guidelines\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_3879db652f2421337691219ace\` ON \`library\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_23d4d78ea8db637df031f86f03\` ON \`license_policy\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_0c6a4d0a6c13a3f5df6ac01509\` ON \`licensing\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a5dae5a376dd49c7c076893d40\` ON \`licensing\` (\`licensePolicyId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_4555dccdda9ba57d8e3a634cd0\` ON \`discussion\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_2d8a3ca181c3f0346817685d21\` ON \`discussion\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_5337074c9b818bb63e6f314c80\` ON \`discussion\` (\`commentsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_3b0c92945f36d06f37de80285d\` ON \`forum\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_9f621c51dd854634d8766a9cfa\` ON \`platform\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_dd88d373c64b04e24705d575c9\` ON \`platform\` (\`forumId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_ca469f5ec53a7719d155d60aca\` ON \`platform\` (\`libraryId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_f516dd9a46616999c7e9a6adc1\` ON \`platform\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_425bbb4b951f7f4629710763fc\` ON \`platform\` (\`licensingId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c0448d2c992a62c9c11bd0f142\` ON \`platform_invitation\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_6e7584bfb417bd0f8e8696ab58\` ON \`community\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_7fbe50fa78a37776ad962cb764\` ON \`community\` (\`communicationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_2e7dd2fa8c829352cfbecb2cc9\` ON \`community\` (\`guidelinesId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c7d74dd6b92d4202c705cd3676\` ON \`community\` (\`applicationFormId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_3823de95920943655430125fa9\` ON \`community\` (\`policyId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a2afa3851ea733de932251b3a1\` ON \`actor\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_bde98d59e8984e7d17034c3b93\` ON \`actor_group\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_658580aea4e1a892227e27db90\` ON \`ecosystem_model\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_5f0dbc3b097ef297bd5f4ddb1a\` ON \`context\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a03169c3f86480ba3863924f4d\` ON \`context\` (\`ecosystemModelId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c3bdb693adb031b6613edcef4f\` ON \`post_template\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_4a9c8cefc6c7e33aa728d22a90\` ON \`post_template\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_cc2faf30ce52648db9299d7072\` ON \`whiteboard_template\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_5b4948db27c348e65055187d5e\` ON \`whiteboard_template\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_3aec561629db1d65a9b2b3a788\` ON \`innovation_flow_template\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_bd591d7403dabe091f6a116975\` ON \`innovation_flow_template\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_6c90723f8f1424e2dd08dddb39\` ON \`callout_template\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_75d5ced6c2e92cbbb5d8d0a913\` ON \`callout_template\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_b94beb9cefe0a8814dceddd10f\` ON \`callout_template\` (\`framingId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_479f799f0d86e43c9d8623e827\` ON \`callout_template\` (\`contributionDefaultsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_29ff764dc6de1a9dc289cbfb01\` ON \`callout_template\` (\`contributionPolicyId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_eb3f02cf18df8943da1673a25b\` ON \`community_guidelines_template\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_25dbe2675edea7b3c4f4aec430\` ON \`community_guidelines_template\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_e1817f55e97bba03a57b928725\` ON \`community_guidelines_template\` (\`guidelinesId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_eb0176ef4b98c143322aa6f809\` ON \`templates_set\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_413ba75964e5a534e4bfa54846\` ON \`space_defaults\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_592a23e68922853bae6ebecd85\` ON \`space_defaults\` (\`innovationFlowTemplateId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_8d03fd2c8e8411ec9192c79cd9\` ON \`space\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_b4250035291aac1329d59224a9\` ON \`space\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_ea06eb8894469a0f262d929bf0\` ON \`space\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_cc0b08eb9679d3daa95153c2af\` ON \`space\` (\`contextId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_68fa2c2b00cc1ed77e7c225e8b\` ON \`space\` (\`communityId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_9c664d684f987a735678b0ba82\` ON \`space\` (\`agentId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_980c4643d7d9de1b97bc39f518\` ON \`space\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_43559aeadc1a5169d17e81b3d4\` ON \`space\` (\`libraryId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_6b1efee39d076d9f7ecb8fef4c\` ON \`space\` (\`defaultsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_293f0d3ef60cb0ca0006044ecf\` ON \`ai_persona\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_e2eaa2213ac4454039cd8abc07\` ON \`virtual_contributor\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_4504c37764f6962ccbd165a21d\` ON \`virtual_contributor\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a8890dcd65b8c3ee6e160d33f3\` ON \`virtual_contributor\` (\`agentId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_55b8101bdf4f566645e928c26e\` ON \`virtual_contributor\` (\`aiPersonaId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_8af8122897b05315e7eb892525\` ON \`innovation_pack\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_5facd6d188068a5a1c5b6f07fc\` ON \`innovation_pack\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a1441e46c8d36090e1f6477cea\` ON \`innovation_pack\` (\`templatesSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_91a165c1091a6959cc19d52239\` ON \`account\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_833582df0c439ab8c9adc5240d\` ON \`account\` (\`agentId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_950221e932175dc7cf7c006488\` ON \`account\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_b411e4f27d77a96eccdabbf4b4\` ON \`innovation_hub\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_36c8905c2c6c59467c60d94fd8\` ON \`innovation_hub\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_9d520fa5fed56042918e48fc4b\` ON \`ai_server\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_79206feb0038b1c5597668dc4b\` ON \`ai_persona_service\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_8495fae86f13836b0745642baa\` ON \`application_questions\` (\`applicationId\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_fe50118fd82e7fe2f74f986a19\` ON \`application_questions\` (\`nvpId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset_template\` ADD CONSTRAINT \`FK_96f23f044acf305c1699e0319d2\` FOREIGN KEY (\`tagsetTemplateSetId\`) REFERENCES \`tagset_template_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` ADD CONSTRAINT \`FK_eb59b98ee6ef26c993d0d75c83c\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` ADD CONSTRAINT \`FK_81fc213b2d9ad0cddeab1a9ce64\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` ADD CONSTRAINT \`FK_644155610ddc40dc4e19781c8f0\` FOREIGN KEY (\`tagsetTemplateId\`) REFERENCES \`tagset_template\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD CONSTRAINT \`FK_4fbd109f9bb84f58b7a3c60649c\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD CONSTRAINT \`FK_1104f3ef8497ca40d99b9f46b87\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_d9e2dfcccf59233c17cc6bc6418\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_851e50ec4be7c62a1f9b9a430bf\` FOREIGN KEY (\`storageBucketId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_9fb9257b14ec21daf5bc9aa4c8e\` FOREIGN KEY (\`tagsetId\`) REFERENCES \`tagset\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_aggregator\` ADD CONSTRAINT \`FK_f3b4d59c0b805c9c1ecb0070e16\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_aggregator\` ADD CONSTRAINT \`FK_b80c28f5335ab5442f63c644d94\` FOREIGN KEY (\`parentStorageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_aggregator\` ADD CONSTRAINT \`FK_0647707288c243e60091c8d8620\` FOREIGN KEY (\`directStorageId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` ADD CONSTRAINT \`FK_f2f48b57269987b13b415a00587\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` ADD CONSTRAINT \`FK_11d0ed50a26da5513f7e4347847\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_a96475631aba7dce41db03cc8b2\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_432056041df0e4337b17ff7b09d\` FOREIGN KEY (\`locationId\`) REFERENCES \`location\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_4a1c74fd2a61b32d9d9500e0650\` FOREIGN KEY (\`storageBucketId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD CONSTRAINT \`FK_73e8ae665a49366ca7e2866a45d\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD CONSTRAINT \`FK_2f46c698fc4c19a8cc233c5f255\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`vc_interaction\` ADD CONSTRAINT \`FK_d6f78c95ff41cdd30e505a4ebbb\` FOREIGN KEY (\`roomId\`) REFERENCES \`room\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` ADD CONSTRAINT \`FK_d1d94dd8e0c417b4188a05ccbca\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD CONSTRAINT \`FK_d3b86160bb7d704212382b0ca44\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD CONSTRAINT \`FK_3f9e9e2798d2a4d84b16ee8477c\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD CONSTRAINT \`FK_c9d7c2c4eb8a1d012ddc6605da9\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD CONSTRAINT \`FK_f53e2d266432e58e538a366705d\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD CONSTRAINT \`FK_8bc0e1f40be5816d3a593cbf7fa\` FOREIGN KEY (\`whiteboardId\`) REFERENCES \`whiteboard\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD CONSTRAINT \`FK_390343b22abec869bf800419333\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD CONSTRAINT \`FK_970844fcd10c2b6df7c1b49eacf\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD CONSTRAINT \`FK_042b9825d770d6b3009ae206c2f\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`link\` ADD CONSTRAINT \`FK_07f249ac87502495710a62c5c01\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`link\` ADD CONSTRAINT \`FK_3bfc8c1aaec1395cc148268d3cd\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_dfa86c46f509a61c6510536cd9a\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_5e34f9a356f6254b8da24f8947b\` FOREIGN KEY (\`whiteboardId\`) REFERENCES \`whiteboard\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_97fefc97fb254c30577696e1c0a\` FOREIGN KEY (\`postId\`) REFERENCES \`post\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_bdf2d0eced5c95968a85caaaaee\` FOREIGN KEY (\`linkId\`) REFERENCES \`link\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_7370de8eb79ed00b0d403f2299a\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_6289dee12effb51320051c6f1fc\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_cf776244b01436d8ca5cc762848\` FOREIGN KEY (\`framingId\`) REFERENCES \`callout_framing\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_1e740008a7e1512966e3b084148\` FOREIGN KEY (\`contributionPolicyId\`) REFERENCES \`callout_contribution_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_36b0da55acff774d0845aeb55f2\` FOREIGN KEY (\`contributionDefaultsId\`) REFERENCES \`callout_contribution_defaults\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_62ed316cda7b75735b20307b47e\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_9b1c5ee044611ac78249194ec35\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_8ee86afa2808a4ab523b9ee6c5e\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_9349e137959f3ca5818c2e62b3f\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_b5069b11030e9608ee4468f850d\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_80ab7835e1749581a27462eb87f\` FOREIGN KEY (\`calendarId\`) REFERENCES \`calendar\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar\` ADD CONSTRAINT \`FK_6e74d59afda096b68d12a699691\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` ADD CONSTRAINT \`FK_5fe58ece01b48496aebc04733da\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` ADD CONSTRAINT \`FK_56aae15a664b2889a1a11c2cf82\` FOREIGN KEY (\`calendarId\`) REFERENCES \`calendar\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD CONSTRAINT \`FK_a6e050daa4c7a3ab1e411c36517\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD CONSTRAINT \`FK_96a8cbe1706f459fd7d883be9bd\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_262ecf3f5d70b82a48336184251\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_b7ece56376ac7ca0b9a56c33b3a\` FOREIGN KEY (\`tagsetTemplateSetId\`) REFERENCES \`tagset_template_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_f67a2d25c945269d602c182fbc0\` FOREIGN KEY (\`timelineId\`) REFERENCES \`timeline\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_35c6b1de6d4d89dfe8e9c85d771\` FOREIGN KEY (\`innovationFlowId\`) REFERENCES \`innovation_flow\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` ADD CONSTRAINT \`FK_c66eddab0caacb1ef8d46bcafdb\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` ADD CONSTRAINT \`FK_1cc3b275fc2a9d9d9b0ae33b310\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD CONSTRAINT \`FK_b4cf0f96bf08cf396f683555229\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD CONSTRAINT \`FK_46d60bf133073f749b8f07e534c\` FOREIGN KEY (\`preferenceDefinitionId\`) REFERENCES \`preference_definition\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD CONSTRAINT \`FK_f4b5742f589e2ac8bfe48b708c0\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_set\` ADD CONSTRAINT \`FK_8e76dcf171c45875c44febb1d8d\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`credential\` ADD CONSTRAINT \`FK_dbe0929355f82e5995f0b7fd5e2\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` ADD CONSTRAINT \`FK_8ed9d1af584fa62f1ad3405b33b\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_e0e150e4f11d906b931b46a2d89\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_d2cb77c14644156ec8e865608e0\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_7f1bec8979b57ed7ebd392a2ca9\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_5a72d5b37312bac2e0a01157185\` FOREIGN KEY (\`verificationId\`) REFERENCES \`organization_verification\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_58fd47c4a6ac8df9fe2bcaed874\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_395aa74996a1f978b4969d114b1\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD CONSTRAINT \`FK_e8e32f1e59c349b406a4752e545\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD CONSTRAINT \`FK_9912e4cfc1e09848a392a651514\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD CONSTRAINT \`FK_694ebec955a90e999d9926b7da8\` FOREIGN KEY (\`organizationId\`) REFERENCES \`organization\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD CONSTRAINT \`FK_9fcc131f256e969d773327f07cb\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_09f909622aa177a097256b7cc22\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_9466682df91534dd95e4dbaa616\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_b61c694cacfab25533bd23d9add\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_028322b763dc94242dc9f638f9b\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_10458c50c10436b6d589b40e5ca\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD CONSTRAINT \`FK_56f5614fff0028d403704995822\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD CONSTRAINT \`FK_7ec2857c7d8d16432ffca1cb3d9\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD CONSTRAINT \`FK_b4ae3fea4a24b4be1a86dacf8a2\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD CONSTRAINT \`FK_500cee6f635849f50e19c7e2b76\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD CONSTRAINT \`FK_a20c5901817dd09d5906537e087\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD CONSTRAINT \`FK_eb99e588873c788a68a035478ab\` FOREIGN KEY (\`updatesId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD CONSTRAINT \`FK_b132226941570cb650a4023d493\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD CONSTRAINT \`FK_b0c80ccf319a1c7a7af12b39987\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD CONSTRAINT \`FK_339c1fe2a9c5caef5b982303fb0\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines\` ADD CONSTRAINT \`FK_684b272e6f7459439d41d2879ee\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines\` ADD CONSTRAINT \`FK_3d60fe4fa40d54bad7d51bb4bd1\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`library\` ADD CONSTRAINT \`FK_3879db652f2421337691219ace8\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_policy\` ADD CONSTRAINT \`FK_23d4d78ea8db637df031f86f030\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` ADD CONSTRAINT \`FK_3030904030f5d30f483b49905d1\` FOREIGN KEY (\`licensingId\`) REFERENCES \`licensing\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing\` ADD CONSTRAINT \`FK_0c6a4d0a6c13a3f5df6ac015096\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing\` ADD CONSTRAINT \`FK_a5dae5a376dd49c7c076893d40b\` FOREIGN KEY (\`licensePolicyId\`) REFERENCES \`license_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_4555dccdda9ba57d8e3a634cd0d\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_2d8a3ca181c3f0346817685d21d\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_5337074c9b818bb63e6f314c808\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_0de78853c1ee793f61bda7eff79\` FOREIGN KEY (\`forumId\`) REFERENCES \`forum\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`forum\` ADD CONSTRAINT \`FK_3b0c92945f36d06f37de80285dd\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_9f621c51dd854634d8766a9cfaf\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_dd88d373c64b04e24705d575c99\` FOREIGN KEY (\`forumId\`) REFERENCES \`forum\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_ca469f5ec53a7719d155d60aca1\` FOREIGN KEY (\`libraryId\`) REFERENCES \`library\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_f516dd9a46616999c7e9a6adc15\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_425bbb4b951f7f4629710763fc0\` FOREIGN KEY (\`licensingId\`) REFERENCES \`licensing\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` ADD CONSTRAINT \`FK_c0448d2c992a62c9c11bd0f1422\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` ADD CONSTRAINT \`FK_b3d3f3c2ce851d1059c4ed26ba2\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` ADD CONSTRAINT \`FK_809c1e6cf3ef6be03a0a1db3f70\` FOREIGN KEY (\`platformId\`) REFERENCES \`platform\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_6e7584bfb417bd0f8e8696ab585\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_7fbe50fa78a37776ad962cb7643\` FOREIGN KEY (\`communicationId\`) REFERENCES \`communication\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_2e7dd2fa8c829352cfbecb2cc93\` FOREIGN KEY (\`guidelinesId\`) REFERENCES \`community_guidelines\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_c7d74dd6b92d4202c705cd36769\` FOREIGN KEY (\`applicationFormId\`) REFERENCES \`form\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_3823de95920943655430125fa93\` FOREIGN KEY (\`policyId\`) REFERENCES \`community_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_8e8283bdacc9e770918fe689333\` FOREIGN KEY (\`parentCommunityId\`) REFERENCES \`community\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` ADD CONSTRAINT \`FK_a2afa3851ea733de932251b3a1f\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` ADD CONSTRAINT \`FK_0f9d41ee193d631a5439bb4f404\` FOREIGN KEY (\`actorGroupId\`) REFERENCES \`actor_group\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` ADD CONSTRAINT \`FK_bde98d59e8984e7d17034c3b937\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` ADD CONSTRAINT \`FK_cbb1d7afa052a184471723d3297\` FOREIGN KEY (\`ecosystemModelId\`) REFERENCES \`ecosystem_model\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` ADD CONSTRAINT \`FK_658580aea4e1a892227e27db902\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD CONSTRAINT \`FK_5f0dbc3b097ef297bd5f4ddb1a9\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD CONSTRAINT \`FK_a03169c3f86480ba3863924f4d7\` FOREIGN KEY (\`ecosystemModelId\`) REFERENCES \`ecosystem_model\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD CONSTRAINT \`FK_c3bdb693adb031b6613edcef4f4\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD CONSTRAINT \`FK_4a9c8cefc6c7e33aa728d22a905\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD CONSTRAINT \`FK_34b22da74bc9e821a99fbe78a19\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD CONSTRAINT \`FK_cc2faf30ce52648db9299d7072b\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD CONSTRAINT \`FK_5b4948db27c348e65055187d5ea\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD CONSTRAINT \`FK_6776ee550271ece75b3b2a5ba18\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD CONSTRAINT \`FK_3aec561629db1d65a9b2b3a788f\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD CONSTRAINT \`FK_bd591d7403dabe091f6a116975d\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD CONSTRAINT \`FK_4b7450c0baad85f4afee2ce25e6\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD CONSTRAINT \`FK_6c90723f8f1424e2dd08dddb393\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD CONSTRAINT \`FK_75d5ced6c2e92cbbb5d8d0a913e\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD CONSTRAINT \`FK_7c434491e8e9ee8af12caff7db3\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD CONSTRAINT \`FK_b94beb9cefe0a8814dceddd10f6\` FOREIGN KEY (\`framingId\`) REFERENCES \`callout_framing\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD CONSTRAINT \`FK_479f799f0d86e43c9d8623e8277\` FOREIGN KEY (\`contributionDefaultsId\`) REFERENCES \`callout_contribution_defaults\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD CONSTRAINT \`FK_29ff764dc6de1a9dc289cbfb01b\` FOREIGN KEY (\`contributionPolicyId\`) REFERENCES \`callout_contribution_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines_template\` ADD CONSTRAINT \`FK_eb3f02cf18df8943da1673a25b8\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines_template\` ADD CONSTRAINT \`FK_25dbe2675edea7b3c4f4aec4300\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines_template\` ADD CONSTRAINT \`FK_8b2d7f497cccf9cac312dac8b46\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines_template\` ADD CONSTRAINT \`FK_e1817f55e97bba03a57b9287251\` FOREIGN KEY (\`guidelinesId\`) REFERENCES \`community_guidelines\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` ADD CONSTRAINT \`FK_eb0176ef4b98c143322aa6f8090\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` ADD CONSTRAINT \`FK_413ba75964e5a534e4bfa54846e\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` ADD CONSTRAINT \`FK_592a23e68922853bae6ebecd85e\` FOREIGN KEY (\`innovationFlowTemplateId\`) REFERENCES \`innovation_flow_template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_8d03fd2c8e8411ec9192c79cd99\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_b4250035291aac1329d59224a96\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_ef1ff4ac7f613cc0677e2295b30\` FOREIGN KEY (\`parentSpaceId\`) REFERENCES \`space\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_6bdeffaf6ea6159b4672a2aed70\` FOREIGN KEY (\`accountId\`) REFERENCES \`account\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_ea06eb8894469a0f262d929bf06\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_cc0b08eb9679d3daa95153c2af5\` FOREIGN KEY (\`contextId\`) REFERENCES \`context\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_68fa2c2b00cc1ed77e7c225e8ba\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_9c664d684f987a735678b0ba825\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_980c4643d7d9de1b97bc39f5185\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_43559aeadc1a5169d17e81b3d45\` FOREIGN KEY (\`libraryId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_6b1efee39d076d9f7ecb8fef4cd\` FOREIGN KEY (\`defaultsId\`) REFERENCES \`space_defaults\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` ADD CONSTRAINT \`FK_293f0d3ef60cb0ca0006044ecfd\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_e2eaa2213ac4454039cd8abc07d\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_4504c37764f6962ccbd165a21de\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_a8890dcd65b8c3ee6e160d33f3a\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_7a962c9b04b0d197bc3c93262a7\` FOREIGN KEY (\`accountId\`) REFERENCES \`account\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_55b8101bdf4f566645e928c26e3\` FOREIGN KEY (\`aiPersonaId\`) REFERENCES \`ai_persona\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_8af8122897b05315e7eb8925253\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_5facd6d188068a5a1c5b6f07fc3\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_51014590f9644e6ff9e0536f40f\` FOREIGN KEY (\`accountId\`) REFERENCES \`account\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_a1441e46c8d36090e1f6477cea5\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` ADD CONSTRAINT \`FK_91a165c1091a6959cc19d522399\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` ADD CONSTRAINT \`FK_833582df0c439ab8c9adc5240d1\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` ADD CONSTRAINT \`FK_950221e932175dc7cf7c0064887\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD CONSTRAINT \`FK_b411e4f27d77a96eccdabbf4b45\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD CONSTRAINT \`FK_36c8905c2c6c59467c60d94fd8a\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD CONSTRAINT \`FK_156fd30246eb151b9d17716abf5\` FOREIGN KEY (\`accountId\`) REFERENCES \`account\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_server\` ADD CONSTRAINT \`FK_9d520fa5fed56042918e48fc4b5\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona_service\` ADD CONSTRAINT \`FK_79206feb0038b1c5597668dc4b5\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona_service\` ADD CONSTRAINT \`FK_b9f20da98058d7bd474152ed6ce\` FOREIGN KEY (\`aiServerId\`) REFERENCES \`ai_server\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` ADD CONSTRAINT \`FK_8495fae86f13836b0745642baa8\` FOREIGN KEY (\`applicationId\`) REFERENCES \`application\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` ADD CONSTRAINT \`FK_fe50118fd82e7fe2f74f986a195\` FOREIGN KEY (\`nvpId\`) REFERENCES \`nvp\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` DROP FOREIGN KEY \`FK_fe50118fd82e7fe2f74f986a195\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` DROP FOREIGN KEY \`FK_8495fae86f13836b0745642baa8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona_service\` DROP FOREIGN KEY \`FK_b9f20da98058d7bd474152ed6ce\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona_service\` DROP FOREIGN KEY \`FK_79206feb0038b1c5597668dc4b5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_server\` DROP FOREIGN KEY \`FK_9d520fa5fed56042918e48fc4b5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` DROP FOREIGN KEY \`FK_156fd30246eb151b9d17716abf5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` DROP FOREIGN KEY \`FK_36c8905c2c6c59467c60d94fd8a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` DROP FOREIGN KEY \`FK_b411e4f27d77a96eccdabbf4b45\``
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` DROP FOREIGN KEY \`FK_950221e932175dc7cf7c0064887\``
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` DROP FOREIGN KEY \`FK_833582df0c439ab8c9adc5240d1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` DROP FOREIGN KEY \`FK_91a165c1091a6959cc19d522399\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_a1441e46c8d36090e1f6477cea5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_51014590f9644e6ff9e0536f40f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_5facd6d188068a5a1c5b6f07fc3\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_8af8122897b05315e7eb8925253\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_55b8101bdf4f566645e928c26e3\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_7a962c9b04b0d197bc3c93262a7\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_a8890dcd65b8c3ee6e160d33f3a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_4504c37764f6962ccbd165a21de\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_e2eaa2213ac4454039cd8abc07d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` DROP FOREIGN KEY \`FK_293f0d3ef60cb0ca0006044ecfd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_6b1efee39d076d9f7ecb8fef4cd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_43559aeadc1a5169d17e81b3d45\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_980c4643d7d9de1b97bc39f5185\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_9c664d684f987a735678b0ba825\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_68fa2c2b00cc1ed77e7c225e8ba\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_cc0b08eb9679d3daa95153c2af5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_ea06eb8894469a0f262d929bf06\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_6bdeffaf6ea6159b4672a2aed70\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_ef1ff4ac7f613cc0677e2295b30\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_b4250035291aac1329d59224a96\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_8d03fd2c8e8411ec9192c79cd99\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` DROP FOREIGN KEY \`FK_592a23e68922853bae6ebecd85e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` DROP FOREIGN KEY \`FK_413ba75964e5a534e4bfa54846e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` DROP FOREIGN KEY \`FK_eb0176ef4b98c143322aa6f8090\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines_template\` DROP FOREIGN KEY \`FK_e1817f55e97bba03a57b9287251\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines_template\` DROP FOREIGN KEY \`FK_8b2d7f497cccf9cac312dac8b46\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines_template\` DROP FOREIGN KEY \`FK_25dbe2675edea7b3c4f4aec4300\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines_template\` DROP FOREIGN KEY \`FK_eb3f02cf18df8943da1673a25b8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP FOREIGN KEY \`FK_29ff764dc6de1a9dc289cbfb01b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP FOREIGN KEY \`FK_479f799f0d86e43c9d8623e8277\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP FOREIGN KEY \`FK_b94beb9cefe0a8814dceddd10f6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP FOREIGN KEY \`FK_7c434491e8e9ee8af12caff7db3\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP FOREIGN KEY \`FK_75d5ced6c2e92cbbb5d8d0a913e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP FOREIGN KEY \`FK_6c90723f8f1424e2dd08dddb393\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP FOREIGN KEY \`FK_4b7450c0baad85f4afee2ce25e6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP FOREIGN KEY \`FK_bd591d7403dabe091f6a116975d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP FOREIGN KEY \`FK_3aec561629db1d65a9b2b3a788f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` DROP FOREIGN KEY \`FK_6776ee550271ece75b3b2a5ba18\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` DROP FOREIGN KEY \`FK_5b4948db27c348e65055187d5ea\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` DROP FOREIGN KEY \`FK_cc2faf30ce52648db9299d7072b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` DROP FOREIGN KEY \`FK_34b22da74bc9e821a99fbe78a19\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` DROP FOREIGN KEY \`FK_4a9c8cefc6c7e33aa728d22a905\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` DROP FOREIGN KEY \`FK_c3bdb693adb031b6613edcef4f4\``
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` DROP FOREIGN KEY \`FK_a03169c3f86480ba3863924f4d7\``
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` DROP FOREIGN KEY \`FK_5f0dbc3b097ef297bd5f4ddb1a9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` DROP FOREIGN KEY \`FK_658580aea4e1a892227e27db902\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` DROP FOREIGN KEY \`FK_cbb1d7afa052a184471723d3297\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` DROP FOREIGN KEY \`FK_bde98d59e8984e7d17034c3b937\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` DROP FOREIGN KEY \`FK_0f9d41ee193d631a5439bb4f404\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` DROP FOREIGN KEY \`FK_a2afa3851ea733de932251b3a1f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_8e8283bdacc9e770918fe689333\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_3823de95920943655430125fa93\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_c7d74dd6b92d4202c705cd36769\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_2e7dd2fa8c829352cfbecb2cc93\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_7fbe50fa78a37776ad962cb7643\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_6e7584bfb417bd0f8e8696ab585\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` DROP FOREIGN KEY \`FK_809c1e6cf3ef6be03a0a1db3f70\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` DROP FOREIGN KEY \`FK_b3d3f3c2ce851d1059c4ed26ba2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` DROP FOREIGN KEY \`FK_c0448d2c992a62c9c11bd0f1422\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_425bbb4b951f7f4629710763fc0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_f516dd9a46616999c7e9a6adc15\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_ca469f5ec53a7719d155d60aca1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_dd88d373c64b04e24705d575c99\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_9f621c51dd854634d8766a9cfaf\``
    );
    await queryRunner.query(
      `ALTER TABLE \`forum\` DROP FOREIGN KEY \`FK_3b0c92945f36d06f37de80285dd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_0de78853c1ee793f61bda7eff79\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_5337074c9b818bb63e6f314c808\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_2d8a3ca181c3f0346817685d21d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_4555dccdda9ba57d8e3a634cd0d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing\` DROP FOREIGN KEY \`FK_a5dae5a376dd49c7c076893d40b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing\` DROP FOREIGN KEY \`FK_0c6a4d0a6c13a3f5df6ac015096\``
    );
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` DROP FOREIGN KEY \`FK_3030904030f5d30f483b49905d1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`license_policy\` DROP FOREIGN KEY \`FK_23d4d78ea8db637df031f86f030\``
    );
    await queryRunner.query(
      `ALTER TABLE \`library\` DROP FOREIGN KEY \`FK_3879db652f2421337691219ace8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines\` DROP FOREIGN KEY \`FK_3d60fe4fa40d54bad7d51bb4bd1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines\` DROP FOREIGN KEY \`FK_684b272e6f7459439d41d2879ee\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP FOREIGN KEY \`FK_339c1fe2a9c5caef5b982303fb0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP FOREIGN KEY \`FK_b0c80ccf319a1c7a7af12b39987\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP FOREIGN KEY \`FK_b132226941570cb650a4023d493\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP FOREIGN KEY \`FK_eb99e588873c788a68a035478ab\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP FOREIGN KEY \`FK_a20c5901817dd09d5906537e087\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP FOREIGN KEY \`FK_500cee6f635849f50e19c7e2b76\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP FOREIGN KEY \`FK_b4ae3fea4a24b4be1a86dacf8a2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP FOREIGN KEY \`FK_7ec2857c7d8d16432ffca1cb3d9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP FOREIGN KEY \`FK_56f5614fff0028d403704995822\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_10458c50c10436b6d589b40e5ca\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_028322b763dc94242dc9f638f9b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_b61c694cacfab25533bd23d9add\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_9466682df91534dd95e4dbaa616\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_09f909622aa177a097256b7cc22\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP FOREIGN KEY \`FK_9fcc131f256e969d773327f07cb\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP FOREIGN KEY \`FK_694ebec955a90e999d9926b7da8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP FOREIGN KEY \`FK_9912e4cfc1e09848a392a651514\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP FOREIGN KEY \`FK_e8e32f1e59c349b406a4752e545\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_395aa74996a1f978b4969d114b1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_58fd47c4a6ac8df9fe2bcaed874\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_5a72d5b37312bac2e0a01157185\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_7f1bec8979b57ed7ebd392a2ca9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_d2cb77c14644156ec8e865608e0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_e0e150e4f11d906b931b46a2d89\``
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` DROP FOREIGN KEY \`FK_8ed9d1af584fa62f1ad3405b33b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`credential\` DROP FOREIGN KEY \`FK_dbe0929355f82e5995f0b7fd5e2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_set\` DROP FOREIGN KEY \`FK_8e76dcf171c45875c44febb1d8d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` DROP FOREIGN KEY \`FK_f4b5742f589e2ac8bfe48b708c0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` DROP FOREIGN KEY \`FK_46d60bf133073f749b8f07e534c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` DROP FOREIGN KEY \`FK_b4cf0f96bf08cf396f683555229\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` DROP FOREIGN KEY \`FK_1cc3b275fc2a9d9d9b0ae33b310\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` DROP FOREIGN KEY \`FK_c66eddab0caacb1ef8d46bcafdb\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_35c6b1de6d4d89dfe8e9c85d771\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_f67a2d25c945269d602c182fbc0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_b7ece56376ac7ca0b9a56c33b3a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_262ecf3f5d70b82a48336184251\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP FOREIGN KEY \`FK_96a8cbe1706f459fd7d883be9bd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP FOREIGN KEY \`FK_a6e050daa4c7a3ab1e411c36517\``
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` DROP FOREIGN KEY \`FK_56aae15a664b2889a1a11c2cf82\``
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` DROP FOREIGN KEY \`FK_5fe58ece01b48496aebc04733da\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar\` DROP FOREIGN KEY \`FK_6e74d59afda096b68d12a699691\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP FOREIGN KEY \`FK_80ab7835e1749581a27462eb87f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP FOREIGN KEY \`FK_b5069b11030e9608ee4468f850d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP FOREIGN KEY \`FK_9349e137959f3ca5818c2e62b3f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP FOREIGN KEY \`FK_8ee86afa2808a4ab523b9ee6c5e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_9b1c5ee044611ac78249194ec35\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_62ed316cda7b75735b20307b47e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_36b0da55acff774d0845aeb55f2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_1e740008a7e1512966e3b084148\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_cf776244b01436d8ca5cc762848\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_6289dee12effb51320051c6f1fc\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP FOREIGN KEY \`FK_7370de8eb79ed00b0d403f2299a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP FOREIGN KEY \`FK_bdf2d0eced5c95968a85caaaaee\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP FOREIGN KEY \`FK_97fefc97fb254c30577696e1c0a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP FOREIGN KEY \`FK_5e34f9a356f6254b8da24f8947b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP FOREIGN KEY \`FK_dfa86c46f509a61c6510536cd9a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`link\` DROP FOREIGN KEY \`FK_3bfc8c1aaec1395cc148268d3cd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`link\` DROP FOREIGN KEY \`FK_07f249ac87502495710a62c5c01\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` DROP FOREIGN KEY \`FK_042b9825d770d6b3009ae206c2f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` DROP FOREIGN KEY \`FK_970844fcd10c2b6df7c1b49eacf\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` DROP FOREIGN KEY \`FK_390343b22abec869bf800419333\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP FOREIGN KEY \`FK_8bc0e1f40be5816d3a593cbf7fa\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP FOREIGN KEY \`FK_f53e2d266432e58e538a366705d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP FOREIGN KEY \`FK_c9d7c2c4eb8a1d012ddc6605da9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP FOREIGN KEY \`FK_3f9e9e2798d2a4d84b16ee8477c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP FOREIGN KEY \`FK_d3b86160bb7d704212382b0ca44\``
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` DROP FOREIGN KEY \`FK_d1d94dd8e0c417b4188a05ccbca\``
    );
    await queryRunner.query(
      `ALTER TABLE \`vc_interaction\` DROP FOREIGN KEY \`FK_d6f78c95ff41cdd30e505a4ebbb\``
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP FOREIGN KEY \`FK_2f46c698fc4c19a8cc233c5f255\``
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP FOREIGN KEY \`FK_73e8ae665a49366ca7e2866a45d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP FOREIGN KEY \`FK_4a1c74fd2a61b32d9d9500e0650\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP FOREIGN KEY \`FK_432056041df0e4337b17ff7b09d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP FOREIGN KEY \`FK_a96475631aba7dce41db03cc8b2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` DROP FOREIGN KEY \`FK_11d0ed50a26da5513f7e4347847\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` DROP FOREIGN KEY \`FK_f2f48b57269987b13b415a00587\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_aggregator\` DROP FOREIGN KEY \`FK_0647707288c243e60091c8d8620\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_aggregator\` DROP FOREIGN KEY \`FK_b80c28f5335ab5442f63c644d94\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_aggregator\` DROP FOREIGN KEY \`FK_f3b4d59c0b805c9c1ecb0070e16\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP FOREIGN KEY \`FK_9fb9257b14ec21daf5bc9aa4c8e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP FOREIGN KEY \`FK_851e50ec4be7c62a1f9b9a430bf\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP FOREIGN KEY \`FK_d9e2dfcccf59233c17cc6bc6418\``
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP FOREIGN KEY \`FK_1104f3ef8497ca40d99b9f46b87\``
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP FOREIGN KEY \`FK_4fbd109f9bb84f58b7a3c60649c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` DROP FOREIGN KEY \`FK_644155610ddc40dc4e19781c8f0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` DROP FOREIGN KEY \`FK_81fc213b2d9ad0cddeab1a9ce64\``
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` DROP FOREIGN KEY \`FK_eb59b98ee6ef26c993d0d75c83c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset_template\` DROP FOREIGN KEY \`FK_96f23f044acf305c1699e0319d2\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_fe50118fd82e7fe2f74f986a19\` ON \`application_questions\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_8495fae86f13836b0745642baa\` ON \`application_questions\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_79206feb0038b1c5597668dc4b\` ON \`ai_persona_service\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_9d520fa5fed56042918e48fc4b\` ON \`ai_server\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_36c8905c2c6c59467c60d94fd8\` ON \`innovation_hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b411e4f27d77a96eccdabbf4b4\` ON \`innovation_hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_950221e932175dc7cf7c006488\` ON \`account\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_833582df0c439ab8c9adc5240d\` ON \`account\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_91a165c1091a6959cc19d52239\` ON \`account\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a1441e46c8d36090e1f6477cea\` ON \`innovation_pack\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_5facd6d188068a5a1c5b6f07fc\` ON \`innovation_pack\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_8af8122897b05315e7eb892525\` ON \`innovation_pack\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_55b8101bdf4f566645e928c26e\` ON \`virtual_contributor\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a8890dcd65b8c3ee6e160d33f3\` ON \`virtual_contributor\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_4504c37764f6962ccbd165a21d\` ON \`virtual_contributor\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_e2eaa2213ac4454039cd8abc07\` ON \`virtual_contributor\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_293f0d3ef60cb0ca0006044ecf\` ON \`ai_persona\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6b1efee39d076d9f7ecb8fef4c\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_43559aeadc1a5169d17e81b3d4\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_980c4643d7d9de1b97bc39f518\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_9c664d684f987a735678b0ba82\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_68fa2c2b00cc1ed77e7c225e8b\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_cc0b08eb9679d3daa95153c2af\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_ea06eb8894469a0f262d929bf0\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b4250035291aac1329d59224a9\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_8d03fd2c8e8411ec9192c79cd9\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_592a23e68922853bae6ebecd85\` ON \`space_defaults\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_413ba75964e5a534e4bfa54846\` ON \`space_defaults\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_eb0176ef4b98c143322aa6f809\` ON \`templates_set\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_e1817f55e97bba03a57b928725\` ON \`community_guidelines_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_25dbe2675edea7b3c4f4aec430\` ON \`community_guidelines_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_eb3f02cf18df8943da1673a25b\` ON \`community_guidelines_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_29ff764dc6de1a9dc289cbfb01\` ON \`callout_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_479f799f0d86e43c9d8623e827\` ON \`callout_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b94beb9cefe0a8814dceddd10f\` ON \`callout_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_75d5ced6c2e92cbbb5d8d0a913\` ON \`callout_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6c90723f8f1424e2dd08dddb39\` ON \`callout_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_bd591d7403dabe091f6a116975\` ON \`innovation_flow_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_3aec561629db1d65a9b2b3a788\` ON \`innovation_flow_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_5b4948db27c348e65055187d5e\` ON \`whiteboard_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_cc2faf30ce52648db9299d7072\` ON \`whiteboard_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_4a9c8cefc6c7e33aa728d22a90\` ON \`post_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c3bdb693adb031b6613edcef4f\` ON \`post_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a03169c3f86480ba3863924f4d\` ON \`context\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_5f0dbc3b097ef297bd5f4ddb1a\` ON \`context\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_658580aea4e1a892227e27db90\` ON \`ecosystem_model\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_bde98d59e8984e7d17034c3b93\` ON \`actor_group\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a2afa3851ea733de932251b3a1\` ON \`actor\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_3823de95920943655430125fa9\` ON \`community\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c7d74dd6b92d4202c705cd3676\` ON \`community\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_2e7dd2fa8c829352cfbecb2cc9\` ON \`community\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_7fbe50fa78a37776ad962cb764\` ON \`community\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6e7584bfb417bd0f8e8696ab58\` ON \`community\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c0448d2c992a62c9c11bd0f142\` ON \`platform_invitation\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_425bbb4b951f7f4629710763fc\` ON \`platform\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_f516dd9a46616999c7e9a6adc1\` ON \`platform\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_ca469f5ec53a7719d155d60aca\` ON \`platform\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_dd88d373c64b04e24705d575c9\` ON \`platform\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_9f621c51dd854634d8766a9cfa\` ON \`platform\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_3b0c92945f36d06f37de80285d\` ON \`forum\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_5337074c9b818bb63e6f314c80\` ON \`discussion\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_2d8a3ca181c3f0346817685d21\` ON \`discussion\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_4555dccdda9ba57d8e3a634cd0\` ON \`discussion\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a5dae5a376dd49c7c076893d40\` ON \`licensing\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_0c6a4d0a6c13a3f5df6ac01509\` ON \`licensing\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_23d4d78ea8db637df031f86f03\` ON \`license_policy\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_3879db652f2421337691219ace\` ON \`library\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_3d60fe4fa40d54bad7d51bb4bd\` ON \`community_guidelines\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_684b272e6f7459439d41d2879e\` ON \`community_guidelines\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b0c80ccf319a1c7a7af12b3998\` ON \`invitation\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b132226941570cb650a4023d49\` ON \`invitation\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_eb99e588873c788a68a035478a\` ON \`communication\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a20c5901817dd09d5906537e08\` ON \`communication\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_7ec2857c7d8d16432ffca1cb3d\` ON \`application\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_56f5614fff0028d40370499582\` ON \`application\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_10458c50c10436b6d589b40e5c\` ON \`user\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_028322b763dc94242dc9f638f9\` ON \`user\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b61c694cacfab25533bd23d9ad\` ON \`user\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_9466682df91534dd95e4dbaa61\` ON \`user\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_09f909622aa177a097256b7cc2\` ON \`user\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_9912e4cfc1e09848a392a65151\` ON \`user_group\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_e8e32f1e59c349b406a4752e54\` ON \`user_group\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_395aa74996a1f978b4969d114b\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_58fd47c4a6ac8df9fe2bcaed87\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_5a72d5b37312bac2e0a0115718\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_7f1bec8979b57ed7ebd392a2ca\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_d2cb77c14644156ec8e865608e\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_e0e150e4f11d906b931b46a2d8\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_8ed9d1af584fa62f1ad3405b33\` ON \`agent\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_8e76dcf171c45875c44febb1d8\` ON \`preference_set\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b4cf0f96bf08cf396f68355522\` ON \`preference\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_1cc3b275fc2a9d9d9b0ae33b31\` ON \`organization_verification\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c66eddab0caacb1ef8d46bcafd\` ON \`organization_verification\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_35c6b1de6d4d89dfe8e9c85d77\` ON \`collaboration\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_f67a2d25c945269d602c182fbc\` ON \`collaboration\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b7ece56376ac7ca0b9a56c33b3\` ON \`collaboration\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_262ecf3f5d70b82a4833618425\` ON \`collaboration\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_96a8cbe1706f459fd7d883be9b\` ON \`innovation_flow\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a6e050daa4c7a3ab1e411c3651\` ON \`innovation_flow\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_56aae15a664b2889a1a11c2cf8\` ON \`timeline\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_5fe58ece01b48496aebc04733d\` ON \`timeline\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6e74d59afda096b68d12a69969\` ON \`calendar\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b5069b11030e9608ee4468f850\` ON \`calendar_event\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_9349e137959f3ca5818c2e62b3\` ON \`calendar_event\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_8ee86afa2808a4ab523b9ee6c5\` ON \`calendar_event\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_62ed316cda7b75735b20307b47\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_36b0da55acff774d0845aeb55f\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_1e740008a7e1512966e3b08414\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_cf776244b01436d8ca5cc76284\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6289dee12effb51320051c6f1f\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_bdf2d0eced5c95968a85caaaae\` ON \`callout_contribution\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_97fefc97fb254c30577696e1c0\` ON \`callout_contribution\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_5e34f9a356f6254b8da24f8947\` ON \`callout_contribution\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_dfa86c46f509a61c6510536cd9\` ON \`callout_contribution\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_3bfc8c1aaec1395cc148268d3c\` ON \`link\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_07f249ac87502495710a62c5c0\` ON \`link\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_042b9825d770d6b3009ae206c2\` ON \`post\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_970844fcd10c2b6df7c1b49eac\` ON \`post\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_390343b22abec869bf80041933\` ON \`post\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_8bc0e1f40be5816d3a593cbf7f\` ON \`callout_framing\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_f53e2d266432e58e538a366705\` ON \`callout_framing\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c9d7c2c4eb8a1d012ddc6605da\` ON \`callout_framing\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_3f9e9e2798d2a4d84b16ee8477\` ON \`whiteboard\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_d3b86160bb7d704212382b0ca4\` ON \`whiteboard\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_d1d94dd8e0c417b4188a05ccbc\` ON \`room\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_73e8ae665a49366ca7e2866a45\` ON \`reference\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_4a1c74fd2a61b32d9d9500e065\` ON \`profile\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_432056041df0e4337b17ff7b09\` ON \`profile\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a96475631aba7dce41db03cc8b\` ON \`profile\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_f2f48b57269987b13b415a0058\` ON \`storage_bucket\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_0647707288c243e60091c8d862\` ON \`storage_aggregator\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_f3b4d59c0b805c9c1ecb0070e1\` ON \`storage_aggregator\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_9fb9257b14ec21daf5bc9aa4c8\` ON \`document\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_d9e2dfcccf59233c17cc6bc641\` ON \`document\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_4fbd109f9bb84f58b7a3c60649\` ON \`visual\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_eb59b98ee6ef26c993d0d75c83\` ON \`tagset\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona_service\` DROP INDEX \`IDX_79206feb0038b1c5597668dc4b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_server\` DROP INDEX \`IDX_9d520fa5fed56042918e48fc4b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`activity\` DROP INDEX \`IDX_07a39cea9426b689be25fd61de\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` DROP INDEX \`IDX_36c8905c2c6c59467c60d94fd8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` DROP INDEX \`IDX_b411e4f27d77a96eccdabbf4b4\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` DROP INDEX \`IDX_8f35d04d098bb6c7c57a9a83ac\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` DROP INDEX \`IDX_1d39dac2c6d2f17286d90c306b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` DROP INDEX \`IDX_950221e932175dc7cf7c006488\``
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` DROP INDEX \`IDX_833582df0c439ab8c9adc5240d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` DROP INDEX \`IDX_91a165c1091a6959cc19d52239\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP INDEX \`IDX_a1441e46c8d36090e1f6477cea\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP INDEX \`IDX_5facd6d188068a5a1c5b6f07fc\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP INDEX \`IDX_8af8122897b05315e7eb892525\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP INDEX \`IDX_55b8101bdf4f566645e928c26e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP INDEX \`IDX_a8890dcd65b8c3ee6e160d33f3\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP INDEX \`IDX_4504c37764f6962ccbd165a21d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP INDEX \`IDX_e2eaa2213ac4454039cd8abc07\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` DROP INDEX \`IDX_293f0d3ef60cb0ca0006044ecf\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP INDEX \`IDX_6b1efee39d076d9f7ecb8fef4c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP INDEX \`IDX_43559aeadc1a5169d17e81b3d4\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP INDEX \`IDX_980c4643d7d9de1b97bc39f518\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP INDEX \`IDX_9c664d684f987a735678b0ba82\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP INDEX \`IDX_68fa2c2b00cc1ed77e7c225e8b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP INDEX \`IDX_cc0b08eb9679d3daa95153c2af\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP INDEX \`IDX_ea06eb8894469a0f262d929bf0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP INDEX \`IDX_b4250035291aac1329d59224a9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP INDEX \`IDX_8d03fd2c8e8411ec9192c79cd9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` DROP INDEX \`IDX_592a23e68922853bae6ebecd85\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` DROP INDEX \`IDX_413ba75964e5a534e4bfa54846\``
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` DROP INDEX \`IDX_eb0176ef4b98c143322aa6f809\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines_template\` DROP INDEX \`IDX_e1817f55e97bba03a57b928725\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines_template\` DROP INDEX \`IDX_25dbe2675edea7b3c4f4aec430\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines_template\` DROP INDEX \`IDX_eb3f02cf18df8943da1673a25b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP INDEX \`IDX_29ff764dc6de1a9dc289cbfb01\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP INDEX \`IDX_479f799f0d86e43c9d8623e827\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP INDEX \`IDX_b94beb9cefe0a8814dceddd10f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP INDEX \`IDX_75d5ced6c2e92cbbb5d8d0a913\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP INDEX \`IDX_6c90723f8f1424e2dd08dddb39\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP INDEX \`IDX_bd591d7403dabe091f6a116975\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP INDEX \`IDX_3aec561629db1d65a9b2b3a788\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` DROP INDEX \`IDX_5b4948db27c348e65055187d5e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` DROP INDEX \`IDX_cc2faf30ce52648db9299d7072\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` DROP INDEX \`IDX_4a9c8cefc6c7e33aa728d22a90\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` DROP INDEX \`IDX_c3bdb693adb031b6613edcef4f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` DROP INDEX \`IDX_a03169c3f86480ba3863924f4d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` DROP INDEX \`IDX_5f0dbc3b097ef297bd5f4ddb1a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` DROP INDEX \`IDX_658580aea4e1a892227e27db90\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` DROP INDEX \`IDX_bde98d59e8984e7d17034c3b93\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` DROP INDEX \`IDX_a2afa3851ea733de932251b3a1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP INDEX \`IDX_3823de95920943655430125fa9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP INDEX \`IDX_c7d74dd6b92d4202c705cd3676\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP INDEX \`IDX_2e7dd2fa8c829352cfbecb2cc9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP INDEX \`IDX_7fbe50fa78a37776ad962cb764\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP INDEX \`IDX_6e7584bfb417bd0f8e8696ab58\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` DROP INDEX \`IDX_c0448d2c992a62c9c11bd0f142\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP INDEX \`IDX_425bbb4b951f7f4629710763fc\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP INDEX \`IDX_f516dd9a46616999c7e9a6adc1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP INDEX \`IDX_ca469f5ec53a7719d155d60aca\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP INDEX \`IDX_dd88d373c64b04e24705d575c9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP INDEX \`IDX_9f621c51dd854634d8766a9cfa\``
    );
    await queryRunner.query(
      `ALTER TABLE \`forum\` DROP INDEX \`IDX_3b0c92945f36d06f37de80285d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP INDEX \`IDX_5337074c9b818bb63e6f314c80\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP INDEX \`IDX_2d8a3ca181c3f0346817685d21\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP INDEX \`IDX_4555dccdda9ba57d8e3a634cd0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing\` DROP INDEX \`IDX_a5dae5a376dd49c7c076893d40\``
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing\` DROP INDEX \`IDX_0c6a4d0a6c13a3f5df6ac01509\``
    );
    await queryRunner.query(
      `ALTER TABLE \`license_policy\` DROP INDEX \`IDX_23d4d78ea8db637df031f86f03\``
    );
    await queryRunner.query(
      `ALTER TABLE \`library\` DROP INDEX \`IDX_3879db652f2421337691219ace\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines\` DROP INDEX \`IDX_3d60fe4fa40d54bad7d51bb4bd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines\` DROP INDEX \`IDX_684b272e6f7459439d41d2879e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP INDEX \`IDX_b0c80ccf319a1c7a7af12b3998\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP INDEX \`IDX_b132226941570cb650a4023d49\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP INDEX \`IDX_eb99e588873c788a68a035478a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP INDEX \`IDX_a20c5901817dd09d5906537e08\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP INDEX \`IDX_7ec2857c7d8d16432ffca1cb3d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP INDEX \`IDX_56f5614fff0028d40370499582\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP INDEX \`IDX_10458c50c10436b6d589b40e5c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP INDEX \`IDX_028322b763dc94242dc9f638f9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP INDEX \`IDX_b61c694cacfab25533bd23d9ad\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP INDEX \`IDX_9466682df91534dd95e4dbaa61\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP INDEX \`IDX_09f909622aa177a097256b7cc2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP INDEX \`IDX_9912e4cfc1e09848a392a65151\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP INDEX \`IDX_e8e32f1e59c349b406a4752e54\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP INDEX \`IDX_395aa74996a1f978b4969d114b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP INDEX \`IDX_58fd47c4a6ac8df9fe2bcaed87\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP INDEX \`IDX_5a72d5b37312bac2e0a0115718\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP INDEX \`IDX_7f1bec8979b57ed7ebd392a2ca\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP INDEX \`IDX_d2cb77c14644156ec8e865608e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP INDEX \`IDX_e0e150e4f11d906b931b46a2d8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` DROP INDEX \`IDX_8ed9d1af584fa62f1ad3405b33\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_set\` DROP INDEX \`IDX_8e76dcf171c45875c44febb1d8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` DROP INDEX \`IDX_b4cf0f96bf08cf396f68355522\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` DROP INDEX \`IDX_1cc3b275fc2a9d9d9b0ae33b31\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` DROP INDEX \`IDX_c66eddab0caacb1ef8d46bcafd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP INDEX \`IDX_35c6b1de6d4d89dfe8e9c85d77\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP INDEX \`IDX_f67a2d25c945269d602c182fbc\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP INDEX \`IDX_b7ece56376ac7ca0b9a56c33b3\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP INDEX \`IDX_262ecf3f5d70b82a4833618425\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP INDEX \`IDX_96a8cbe1706f459fd7d883be9b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP INDEX \`IDX_a6e050daa4c7a3ab1e411c3651\``
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` DROP INDEX \`IDX_56aae15a664b2889a1a11c2cf8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` DROP INDEX \`IDX_5fe58ece01b48496aebc04733d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar\` DROP INDEX \`IDX_6e74d59afda096b68d12a69969\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP INDEX \`IDX_b5069b11030e9608ee4468f850\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP INDEX \`IDX_9349e137959f3ca5818c2e62b3\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP INDEX \`IDX_8ee86afa2808a4ab523b9ee6c5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP INDEX \`IDX_62ed316cda7b75735b20307b47\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP INDEX \`IDX_36b0da55acff774d0845aeb55f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP INDEX \`IDX_1e740008a7e1512966e3b08414\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP INDEX \`IDX_cf776244b01436d8ca5cc76284\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP INDEX \`IDX_6289dee12effb51320051c6f1f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP INDEX \`IDX_bdf2d0eced5c95968a85caaaae\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP INDEX \`IDX_97fefc97fb254c30577696e1c0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP INDEX \`IDX_5e34f9a356f6254b8da24f8947\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP INDEX \`IDX_dfa86c46f509a61c6510536cd9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`link\` DROP INDEX \`IDX_3bfc8c1aaec1395cc148268d3c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`link\` DROP INDEX \`IDX_07f249ac87502495710a62c5c0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` DROP INDEX \`IDX_042b9825d770d6b3009ae206c2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` DROP INDEX \`IDX_970844fcd10c2b6df7c1b49eac\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` DROP INDEX \`IDX_390343b22abec869bf80041933\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP INDEX \`IDX_8bc0e1f40be5816d3a593cbf7f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP INDEX \`IDX_f53e2d266432e58e538a366705\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP INDEX \`IDX_c9d7c2c4eb8a1d012ddc6605da\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP INDEX \`IDX_3f9e9e2798d2a4d84b16ee8477\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP INDEX \`IDX_d3b86160bb7d704212382b0ca4\``
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` DROP INDEX \`IDX_d1d94dd8e0c417b4188a05ccbc\``
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP INDEX \`IDX_73e8ae665a49366ca7e2866a45\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP INDEX \`IDX_4a1c74fd2a61b32d9d9500e065\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP INDEX \`IDX_432056041df0e4337b17ff7b09\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP INDEX \`IDX_a96475631aba7dce41db03cc8b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` DROP INDEX \`IDX_f2f48b57269987b13b415a0058\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_aggregator\` DROP INDEX \`IDX_0647707288c243e60091c8d862\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_aggregator\` DROP INDEX \`IDX_f3b4d59c0b805c9c1ecb0070e1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP INDEX \`IDX_9fb9257b14ec21daf5bc9aa4c8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP INDEX \`IDX_d9e2dfcccf59233c17cc6bc641\``
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP INDEX \`IDX_4fbd109f9bb84f58b7a3c60649\``
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` DROP INDEX \`IDX_eb59b98ee6ef26c993d0d75c83\``
    );
  }
}

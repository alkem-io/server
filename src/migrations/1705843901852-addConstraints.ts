import { MigrationInterface, QueryRunner } from 'typeorm';

export class addConstraints1705843901852 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
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
      `ALTER TABLE \`storage_bucket\` ADD UNIQUE INDEX \`IDX_f2f48b57269987b13b415a0058\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD UNIQUE INDEX \`IDX_432056041df0e4337b17ff7b09\` (\`locationId\`)`
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
      `ALTER TABLE \`organization\` ADD UNIQUE INDEX \`IDX_9fdd8f0bfe04a676822c7265e1\` (\`rowId\`)`
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
      `ALTER TABLE \`organization\` ADD UNIQUE INDEX \`IDX_395aa74996a1f978b4969d114b\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_028322b763dc94242dc9f638f9\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_10458c50c10436b6d589b40e5c\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` ADD UNIQUE INDEX \`IDX_d1d94dd8e0c417b4188a05ccbc\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD UNIQUE INDEX \`IDX_2d8a3ca181c3f0346817685d21\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD UNIQUE INDEX \`IDX_5337074c9b818bb63e6f314c80\` (\`commentsId\`)`
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
      `ALTER TABLE \`community\` ADD UNIQUE INDEX \`IDX_c7d74dd6b92d4202c705cd3676\` (\`applicationFormId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD UNIQUE INDEX \`IDX_3823de95920943655430125fa9\` (\`policyId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` ADD UNIQUE INDEX \`IDX_e85c3329a73901499b08268da7\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` ADD UNIQUE INDEX \`IDX_740508d60c7a6de2c2a706f202\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD UNIQUE INDEX \`IDX_d3b86160bb7d704212382b0ca4\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD UNIQUE INDEX \`IDX_3f9e9e2798d2a4d84b16ee8477\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD UNIQUE INDEX \`IDX_4db6290f461fa726e86cf3d634\` (\`checkoutId\`)`
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
      `ALTER TABLE \`callout\` ADD UNIQUE INDEX \`IDX_cf776244b01436d8ca5cc76284\` (\`framingId\`)`
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
      `ALTER TABLE \`collaboration\` ADD UNIQUE INDEX \`IDX_b7ece56376ac7ca0b9a56c33b3\` (\`tagsetTemplateSetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD UNIQUE INDEX \`IDX_f67a2d25c945269d602c182fbc\` (\`timelineId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD UNIQUE INDEX \`IDX_6814b5d57d931283b1a2a1908c\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD UNIQUE INDEX \`IDX_0af5c8e5c0a2f7858ae0a40c04\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD UNIQUE INDEX \`IDX_96a8cbe1706f459fd7d883be9b\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD UNIQUE INDEX \`IDX_a6e050daa4c7a3ab1e411c3651\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD UNIQUE INDEX \`IDX_e3b287bbffe59aba827d97d5fa\` (\`rowId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD UNIQUE INDEX \`IDX_28129cec24e65cc8340ecd1284\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD UNIQUE INDEX \`IDX_a37ebd95962285f8339bffb157\` (\`innovationFlowId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD UNIQUE INDEX \`IDX_8488dda5c509a57e6070e8c3b0\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD UNIQUE INDEX \`IDX_313c12afe69143a9ee3779b4f6\` (\`rowId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD UNIQUE INDEX \`IDX_eedbe52ec6041ac337528d3dd0\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD UNIQUE INDEX \`IDX_0ec10c5ca99e2b7bbdeeaf6ff0\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD UNIQUE INDEX \`IDX_e62d620c2e7ea854d8832db720\` (\`innovationFlowId\`)`
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
      `ALTER TABLE \`callout_template\` ADD UNIQUE INDEX \`IDX_479f799f0d86e43c9d8623e827\` (\`contributionDefaultsId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD UNIQUE INDEX \`IDX_29ff764dc6de1a9dc289cbfb01\` (\`contributionPolicyId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` ADD UNIQUE INDEX \`IDX_eb0176ef4b98c143322aa6f809\` (\`authorizationId\`)`
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
      `ALTER TABLE \`space\` ADD UNIQUE INDEX \`IDX_85e1d68e22378dc2e81bce8d3a\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD UNIQUE INDEX \`IDX_3ef80ef55ba1a1d45e625ea838\` (\`licenseId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD UNIQUE INDEX \`IDX_ef077d5cc64cd388217db42ea9\` (\`templatesSetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD UNIQUE INDEX \`IDX_980c4643d7d9de1b97bc39f518\` (\`storageAggregatorId\`)`
    );
    // ======================================== FIXING ONE-TO-ONE RELATIONSHIPS ========================================
    // PLATFORM
    await queryRunner.query(`DROP INDEX \`FK_55333901817dd09d5906537e088\` ON \`platform\``); // communicationId
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD UNIQUE INDEX \`REL_3eb4c1d5063176a184485399f1\` (\`communicationId\`)`
    );
    await queryRunner.query(`DROP INDEX \`FK_5554d59c0b805c9c1ecb0070e16\` ON \`platform\``); // storageAggregatorId
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD UNIQUE INDEX \`REL_f516dd9a46616999c7e9a6adc1\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD UNIQUE INDEX \`REL_ca469f5ec53a7719d155d60aca\` (\`libraryId\`)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

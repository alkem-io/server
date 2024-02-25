import { MigrationInterface, QueryRunner } from 'typeorm';

export class flowStates1708769388221 implements MigrationInterface {
  name = 'flowStates1708769388221';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`tagset_template\` DROP FOREIGN KEY \`FK_9ad35130cde781b69259eec7d85\``
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` DROP FOREIGN KEY \`FK_7ab35130cde781b69259eec7d85\``
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP FOREIGN KEY \`FK_439d0b187986492b58178a82c3f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP FOREIGN KEY \`FK_77771450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP FOREIGN KEY \`FK_11155450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP FOREIGN KEY \`FK_11155901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP FOREIGN KEY \`FK_222838434c7198a323ea6f475fb\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP FOREIGN KEY \`FK_3337f26ca267009fcf514e0e726\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` DROP FOREIGN KEY \`FK_77755901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP FOREIGN KEY \`FK_77777ca8ac212b8357637794d6f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` DROP FOREIGN KEY \`FK_44446901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` DROP FOREIGN KEY \`FK_59991450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` DROP FOREIGN KEY \`FK_66666450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` DROP FOREIGN KEY \`FK_45556901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` DROP FOREIGN KEY \`FK_65556450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` DROP FOREIGN KEY \`FK_69991450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP FOREIGN KEY \`FK_76546450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP FOREIGN KEY \`FK_76546901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP FOREIGN KEY \`FK_79991450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` DROP FOREIGN KEY \`FK_353b042af56f01ce222f08abf49\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` DROP FOREIGN KEY \`FK_bd3c7c6c2dbc2a8daf4b1500a69\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP FOREIGN KEY \`FK_08d1ccc94b008dbda894a3cfa20\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP FOREIGN KEY \`FK_1dc9521a013c92854e92e099335\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP FOREIGN KEY \`FK_29991450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP FOREIGN KEY \`FK_83bbc10ba2ddee4502bf327f1f5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP FOREIGN KEY \`FK_bffd07760b73be1aad13b6d00c3\``
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` DROP FOREIGN KEY \`FK_66666901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`library\` DROP FOREIGN KEY \`FK_33333901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`library\` DROP FOREIGN KEY \`FK_6664d59c0b805c9c1ecb0070e16\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_22222901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_39991450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_55555901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_77777450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` DROP FOREIGN KEY \`FK_77775901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_345655450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP FOREIGN KEY \`FK_777750fa78a37776ad962cb7643\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_44333901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_55333901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_5554d59c0b805c9c1ecb0070e16\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` DROP FOREIGN KEY \`FK_22be0d440df7972d9b3a94aa6d5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` DROP FOREIGN KEY \`FK_3795f9dd15ef3ef2dd1d27e309c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` DROP FOREIGN KEY \`FK_49030bc57aa0f319cee7996fca1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` DROP FOREIGN KEY \`FK_650fb4e564a8b4b4ac344270744\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` DROP FOREIGN KEY \`FK_88881fbd1fef95a0540f7e7d1e2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_set\` DROP FOREIGN KEY \`FK_88885901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_037ba4b170844c039e74aa22ecd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_3334d59c0b805c9c1ecb0070e16\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_7671a7e33f6665764f4534a5967\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_95bbac07221e98072beafa61732\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_badc07674ce4e44801e5a5f36ce\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_c07b5b4c96fa89cb80215827668\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP FOREIGN KEY \`FK_2b8381df8c3a1680f50e4bc2351\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_4444d59c0b805c9c1ecb0070e16\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_5ea996d22fbd9d522a59a39b74e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP FOREIGN KEY \`FK_339c1fe2a9c5caef5b982303fb0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation_external\` DROP FOREIGN KEY \`FK_2a985f774bd4de2a9aead6bd5b1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_25543901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_35533901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` DROP FOREIGN KEY \`FK_00a8c330495ef844bfc6975ec89\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` DROP FOREIGN KEY \`FK_67663901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` DROP FOREIGN KEY \`FK_c4fb636888fc391cf1d7406e891\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP FOREIGN KEY \`FK_111838434c7198a323ea6f475fb\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP FOREIGN KEY \`FK_157de0ce487e25bb69437e80b13\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP FOREIGN KEY \`FK_22255901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP FOREIGN KEY \`FK_6a30f26ca267009fcf514e0e726\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP FOREIGN KEY \`FK_77755450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar\` DROP FOREIGN KEY \`FK_33355901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` DROP FOREIGN KEY \`FK_22443901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` DROP FOREIGN KEY \`FK_66355901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_1a135130cde781b69259eec7d85\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_3005ed9ce3f57c250c59d6d5065\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP FOREIGN KEY \`FK_4b4a68698d32f610a5fc1880c7f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP FOREIGN KEY \`FK_da1a68698d32f610a5fc1880c7f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP FOREIGN KEY \`FK_da7368698d32f610a5fc1880c7f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`feature_flag\` DROP FOREIGN KEY \`FK_7e3e0a8b6d3e9b4a3a0d6e3a3e3\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_1114d59c0b805c9c1ecb0070e16\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_17a161eef37c9f07186532ab758\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_33336901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_6325f4ef25c4e07e723a96ed37c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_6bf7adf4308991457fdb04624e2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_6db8627abbf00b1b986e359054f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_71231450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_b0c3f360534db92017e36a00bb2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_f5ad15bcb06a95c2a109fbcce2a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP FOREIGN KEY \`FK_49991450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_4840f1e3ae5509245bdb5c401f3\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_89894d59c0b805c9c1ecb0070e16\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_91231450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_2224d59c0b805c9c1ecb0070e16\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_494b27cb13b59128fb24b365ca6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_4c435130cde781b69259eec7d85\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_81231450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_c890de5a08d363719a41703a638\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` DROP FOREIGN KEY \`FK_8495fae86f13836b0745642baa8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` DROP FOREIGN KEY \`FK_fe50118fd82e7fe2f74f986a195\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_4fbd109f9bb84f58b7a3c60649\` ON \`visual\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_439d0b187986492b58178a82c3\` ON \`visual\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_9fb9257b14ec21daf5bc9aa4c8\` ON \`document\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_d9e2dfcccf59233c17cc6bc641\` ON \`document\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_f2f48b57269987b13b415a0058\` ON \`storage_bucket\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_77994efc5eb5936ed70f2c55903\` ON \`storage_bucket\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_432056041df0e4337b17ff7b09\` ON \`profile\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_4a1c74fd2a61b32d9d9500e065\` ON \`profile\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_77777ca8ac212b8357637794d6\` ON \`profile\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_4a9c8cefc6c7e33aa728d22a90\` ON \`post_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_c3bdb693adb031b6613edcef4f\` ON \`post_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_44447ccdda9ba57d8e3a634cd8\` ON \`post_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_5b4948db27c348e65055187d5e\` ON \`whiteboard_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_cc2faf30ce52648db9299d7072\` ON \`whiteboard_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_88888ccdda9ba57d8e3a634cd8\` ON \`whiteboard_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_3aec561629db1d65a9b2b3a788\` ON \`innovation_flow_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_bd591d7403dabe091f6a116975\` ON \`innovation_flow_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_76542ccdda9ba57d8e3a634cd8\` ON \`innovation_flow_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_740508d60c7a6de2c2a706f202\` ON \`whiteboard_checkout\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_e85c3329a73901499b08268da7\` ON \`whiteboard_checkout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_353b042af56f01ce222f08abf4\` ON \`whiteboard_checkout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_bd3c7c6c2dbc2a8daf4b1500a6\` ON \`whiteboard_checkout\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_08d1ccc94b008dbda894a3cfa2\` ON \`whiteboard\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_1dc9521a013c92854e92e09933\` ON \`whiteboard\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_3f9e9e2798d2a4d84b16ee8477\` ON \`whiteboard\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_4db6290f461fa726e86cf3d634\` ON \`whiteboard\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_d3b86160bb7d704212382b0ca4\` ON \`whiteboard\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_08d1ccc94b008dbda894a3cfa2\` ON \`whiteboard\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_1dc9521a013c92854e92e09933\` ON \`whiteboard\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_62712f63939a6d56fd5c334ee3\` ON \`callout_framing\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_29ff764dc6de1a9dc289cbfb01\` ON \`callout_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_479f799f0d86e43c9d8623e827\` ON \`callout_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_83bbc10ba2ddee4502bf327f1f\` ON \`callout_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_bffd07760b73be1aad13b6d00c\` ON \`callout_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_eb0176ef4b98c143322aa6f809\` ON \`templates_set\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_66666ccdda9ba57d8e3a634cd8\` ON \`templates_set\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_33333ccdda9ba57d8e3a634cd8\` ON \`library\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_22222ccdda9ba57d8e3a634cd8\` ON \`innovation_pack\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_0f03c61020ea0dfa0198c60304\` ON \`activity\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_d1d94dd8e0c417b4188a05ccbc\` ON \`room\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_7777dccdda9ba57d8e3a634cd8\` ON \`room\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_2d8a3ca181c3f0346817685d21\` ON \`discussion\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_5337074c9b818bb63e6f314c80\` ON \`discussion\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_eb99e588873c788a68a035478a\` ON \`communication\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_44333ccdda9ba57d8e3a634cd8\` ON \`platform\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_1cc3b275fc2a9d9d9b0ae33b31\` ON \`organization_verification\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_c66eddab0caacb1ef8d46bcafd\` ON \`organization_verification\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_22be0d440df7972d9b3a94aa6d\` ON \`organization_verification\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_3795f9dd15ef3ef2dd1d27e309\` ON \`organization_verification\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_b4cf0f96bf08cf396f68355522\` ON \`preference\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_49030bc57aa0f319cee7996fca\` ON \`preference\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_8e76dcf171c45875c44febb1d8\` ON \`preference_set\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_8888dccdda9ba57d8e3a634cd8\` ON \`preference_set\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_266bc44a18601f893566962df7\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_395aa74996a1f978b4969d114b\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_58fd47c4a6ac8df9fe2bcaed87\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_5a72d5b37312bac2e0a0115718\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_7f1bec8979b57ed7ebd392a2ca\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_95bbac07221e98072beafa6173\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_d2cb77c14644156ec8e865608e\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_e0e150e4f11d906b931b46a2d8\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_037ba4b170844c039e74aa22ec\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_7671a7e33f6665764f4534a596\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_95bbac07221e98072beafa6173\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_badc07674ce4e44801e5a5f36c\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_028322b763dc94242dc9f638f9\` ON \`user\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_10458c50c10436b6d589b40e5c\` ON \`user\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_88880355b4e9bd6b02c66507aa\` ON \`user\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_b0c80ccf319a1c7a7af12b3998\` ON \`invitation\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_b132226941570cb650a4023d49\` ON \`invitation\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_3823de95920943655430125fa9\` ON \`community\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_7fbe50fa78a37776ad962cb764\` ON \`community\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_c7d74dd6b92d4202c705cd3676\` ON \`community\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_c9ff67519d26140f98265a542e\` ON \`community\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_042b9825d770d6b3009ae206c2\` ON \`post\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_390343b22abec869bf80041933\` ON \`post\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_67663901817dd09d5906537e088\` ON \`post\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_970844fcd10c2b6df7c1b49eac\` ON \`post\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_c4fb636888fc391cf1d7406e89\` ON \`post\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c4fb636888fc391cf1d7406e89\` ON \`post\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c52470717008d58ec6d76b12ff\` ON \`post\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_1e740008a7e1512966e3b08414\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_36b0da55acff774d0845aeb55f\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_62ed316cda7b75735b20307b47\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_cf776244b01436d8ca5cc76284\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_111838434c7198a323ea6f475fb\` ON \`calendar_event\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_8ee86afa2808a4ab523b9ee6c5\` ON \`calendar_event\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_9349e137959f3ca5818c2e62b3\` ON \`calendar_event\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_b5069b11030e9608ee4468f850\` ON \`calendar_event\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_22222ccdda9ba57d8e3a634cd8\` ON \`calendar_event\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_222adf666c59b9eb5ce394714cf\` ON \`calendar_event\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a3693e1d3472c5ef8b00e51acfd\` ON \`calendar_event\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_6e74d59afda096b68d12a69969\` ON \`calendar\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_94994efc5eb5936ed70f2c55903\` ON \`calendar\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_56aae15a664b2889a1a11c2cf8\` ON \`timeline\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_5fe58ece01b48496aebc04733d\` ON \`timeline\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_10ed346b16ca044cd84fb1c4034\` ON \`timeline\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_e6203bc09ec8b93debeb3a44cb9\` ON \`timeline\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_b7ece56376ac7ca0b9a56c33b3\` ON \`collaboration\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_f67a2d25c945269d602c182fbc\` ON \`collaboration\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_0af5c8e5c0a2f7858ae0a40c04\` ON \`innovation_flow\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_96a8cbe1706f459fd7d883be9b\` ON \`innovation_flow\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_a6e050daa4c7a3ab1e411c3651\` ON \`innovation_flow\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_98a7abc9f297ffcacb53087dc8\` ON \`innovation_flow\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_3ef80ef55ba1a1d45e625ea838\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_6325f4ef25c4e07e723a96ed37\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_68fa2c2b00cc1ed77e7c225e8b\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_85e1d68e22378dc2e81bce8d3a\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_8d03fd2c8e8411ec9192c79cd9\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_980c4643d7d9de1b97bc39f518\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_99990355b4e9bd6b02c66507aa\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_9c664d684f987a735678b0ba82\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_b4250035291aac1329d59224a9\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_cc0b08eb9679d3daa95153c2af\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_ea06eb8894469a0f262d929bf0\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_ef077d5cc64cd388217db42ea9\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_17a161eef37c9f07186532ab75\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6db8627abbf00b1b986e359054\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b0c3f360534db92017e36a00bb\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_f5ad15bcb06a95c2a109fbcce2\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_6814b5d57d931283b1a2a1908c\` ON \`project\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_28129cec24e65cc8340ecd1284\` ON \`opportunity\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_313c12afe69143a9ee3779b4f6\` ON \`opportunity\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_8488dda5c509a57e6070e8c3b0\` ON \`opportunity\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_a37ebd95962285f8339bffb157\` ON \`opportunity\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_fa617e79d6b2926edc7b4a3878\` ON \`opportunity\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_0ec10c5ca99e2b7bbdeeaf6ff0\` ON \`challenge\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_88592bee71718eec66a3bfc63f\` ON \`challenge\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_d4551f18fed106ae2e20c70f7c\` ON \`challenge\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_e3b287bbffe59aba827d97d5fa\` ON \`challenge\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_e62d620c2e7ea854d8832db720\` ON \`challenge\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_eedbe52ec6041ac337528d3dd0\` ON \`challenge\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` CHANGE \`spaceId\` \`spaceID\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` DROP COLUMN \`whiteboardId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP COLUMN \`lifecycleId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`spaceId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` ADD \`whiteboardID\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD \`states\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`spaceID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset_template\` CHANGE \`name\` \`name\` varchar(255) NOT NULL DEFAULT 'default'`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset_template\` CHANGE \`type\` \`type\` varchar(255) NOT NULL DEFAULT 'freeform'`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset_template\` CHANGE \`allowedValues\` \`allowedValues\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` CHANGE \`type\` \`type\` varchar(255) NOT NULL DEFAULT 'freeform'`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` CHANGE \`uri\` \`uri\` text NOT NULL DEFAULT ''`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP COLUMN \`aspectRatio\``
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD \`aspectRatio\` decimal(2,1) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD UNIQUE INDEX \`IDX_4fbd109f9bb84f58b7a3c60649\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` CHANGE \`city\` \`city\` varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` CHANGE \`country\` \`country\` varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` DROP COLUMN \`addressLine1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` ADD \`addressLine1\` varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` DROP COLUMN \`addressLine2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` ADD \`addressLine2\` varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` DROP COLUMN \`stateOrProvince\``
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` ADD \`stateOrProvince\` varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` DROP COLUMN \`postalCode\``
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` ADD \`postalCode\` varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP COLUMN \`displayName\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD \`displayName\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` CHANGE \`mimeType\` \`mimeType\` varchar(36) NOT NULL DEFAULT ''`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` CHANGE \`size\` \`size\` int NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` CHANGE \`externalID\` \`externalID\` varchar(128) NOT NULL DEFAULT ''`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD UNIQUE INDEX \`IDX_d9e2dfcccf59233c17cc6bc641\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD UNIQUE INDEX \`IDX_9fb9257b14ec21daf5bc9aa4c8\` (\`tagsetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` CHANGE \`allowedMimeTypes\` \`allowedMimeTypes\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` CHANGE \`maxFileSize\` \`maxFileSize\` int NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` ADD UNIQUE INDEX \`IDX_f2f48b57269987b13b415a0058\` (\`authorizationId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`profile\` DROP COLUMN \`tagline\``);
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`tagline\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD UNIQUE INDEX \`IDX_432056041df0e4337b17ff7b09\` (\`locationId\`)`
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_8f35d04d098bb6c7c57a9a83ac\` ON \`innovation_hub\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` DROP COLUMN \`subdomain\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD \`subdomain\` varchar(63) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD UNIQUE INDEX \`IDX_8f35d04d098bb6c7c57a9a83ac\` (\`subdomain\`)`
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
      `ALTER TABLE \`innovation_flow_template\` DROP COLUMN \`type\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD \`type\` varchar(255) NOT NULL DEFAULT 'challenge'`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD UNIQUE INDEX \`IDX_3aec561629db1d65a9b2b3a788\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD UNIQUE INDEX \`IDX_bd591d7403dabe091f6a116975\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` ADD UNIQUE INDEX \`IDX_e85c3329a73901499b08268da7\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` ADD UNIQUE INDEX \`IDX_740508d60c7a6de2c2a706f202\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP COLUMN \`nameID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD \`nameID\` varchar(255) NOT NULL`
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
      `ALTER TABLE \`whiteboard_rt\` CHANGE \`contentUpdatePolicy\` \`contentUpdatePolicy\` varchar(255) NOT NULL DEFAULT 'admins'`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP FOREIGN KEY \`FK_62712f63939a6d56fd5c334ee3f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD UNIQUE INDEX \`IDX_62712f63939a6d56fd5c334ee3\` (\`whiteboardRtId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution_policy\` CHANGE \`state\` \`state\` varchar(255) NOT NULL DEFAULT 'open'`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD UNIQUE INDEX \`IDX_479f799f0d86e43c9d8623e827\` (\`contributionDefaultsId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD UNIQUE INDEX \`IDX_29ff764dc6de1a9dc289cbfb01\` (\`contributionPolicyId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` CHANGE \`policy\` \`policy\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` ADD UNIQUE INDEX \`IDX_eb0176ef4b98c143322aa6f809\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`library\` ADD UNIQUE INDEX \`IDX_3879db652f2421337691219ace\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP COLUMN \`nameID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD \`nameID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD UNIQUE INDEX \`IDX_8af8122897b05315e7eb892525\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`activity\` ADD UNIQUE INDEX \`IDX_07a39cea9426b689be25fd61de\` (\`rowId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`activity\` CHANGE \`triggeredBy\` \`triggeredBy\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`activity\` CHANGE \`resourceID\` \`resourceID\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`activity\` CHANGE \`parentID\` \`parentID\` char(36) NULL DEFAULT ''`
    );
    await queryRunner.query(
      `ALTER TABLE \`activity\` CHANGE \`collaborationID\` \`collaborationID\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`activity\` CHANGE \`visibility\` \`visibility\` tinyint NOT NULL DEFAULT 1`
    );
    await queryRunner.query(
      `ALTER TABLE \`activity\` DROP COLUMN \`description\``
    );
    await queryRunner.query(
      `ALTER TABLE \`activity\` ADD \`description\` varchar(128) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`activity\` DROP COLUMN \`type\``);
    await queryRunner.query(
      `ALTER TABLE \`activity\` ADD \`type\` varchar(16) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`room\` DROP COLUMN \`type\``);
    await queryRunner.query(`ALTER TABLE \`room\` ADD \`type\` text NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE \`room\` ADD UNIQUE INDEX \`IDX_d1d94dd8e0c417b4188a05ccbc\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_2d8a3ca181c3f0346817685d21d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP COLUMN \`nameID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD \`nameID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD UNIQUE INDEX \`IDX_2d8a3ca181c3f0346817685d21\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD UNIQUE INDEX \`IDX_5337074c9b818bb63e6f314c80\` (\`commentsId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP COLUMN \`spaceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD \`spaceID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` CHANGE \`discussionCategories\` \`discussionCategories\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD UNIQUE INDEX \`IDX_eb99e588873c788a68a035478a\` (\`updatesId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD UNIQUE INDEX \`IDX_9f621c51dd854634d8766a9cfa\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` DROP COLUMN \`organizationID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` ADD \`organizationID\` varchar(255) NOT NULL`
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
      `ALTER TABLE \`credential\` DROP COLUMN \`resourceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`credential\` ADD \`resourceID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP COLUMN \`nameID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD \`nameID\` varchar(255) NOT NULL`
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
      `ALTER TABLE \`user_group\` DROP COLUMN \`spaceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD \`spaceID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`nvp\` DROP COLUMN \`value\``);
    await queryRunner.query(
      `ALTER TABLE \`nvp\` ADD \`value\` varchar(255) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`nameID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_028322b763dc94242dc9f638f9\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_10458c50c10436b6d589b40e5c\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP COLUMN \`spaceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD \`spaceID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_policy\` CHANGE \`member\` \`member\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_policy\` CHANGE \`lead\` \`lead\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_policy\` CHANGE \`admin\` \`admin\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_policy\` CHANGE \`host\` \`host\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`form\` CHANGE \`questions\` \`questions\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP FOREIGN KEY \`FK_b132226941570cb650a4023d493\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP FOREIGN KEY \`FK_b0c80ccf319a1c7a7af12b39987\``
    );
    await queryRunner.query(`ALTER TABLE \`invitation\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`invitation\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD \`id\` char(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b132226941570cb650a4023d49\` ON \`invitation\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD \`authorizationId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD UNIQUE INDEX \`IDX_b132226941570cb650a4023d49\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b0c80ccf319a1c7a7af12b3998\` ON \`invitation\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP COLUMN \`lifecycleId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD \`lifecycleId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD UNIQUE INDEX \`IDX_b0c80ccf319a1c7a7af12b3998\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP COLUMN \`communityId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD \`communityId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_7fbe50fa78a37776ad962cb7643\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`spaceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`spaceID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD UNIQUE INDEX \`IDX_7fbe50fa78a37776ad962cb764\` (\`communicationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD UNIQUE INDEX \`IDX_c7d74dd6b92d4202c705cd3676\` (\`applicationFormId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD UNIQUE INDEX \`IDX_3823de95920943655430125fa9\` (\`policyId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`post\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD \`nameID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`post\` DROP COLUMN \`type\``);
    await queryRunner.query(`ALTER TABLE \`post\` ADD \`type\` text NOT NULL`);
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
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_1e740008a7e1512966e3b084148\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_36b0da55acff774d0845aeb55f2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_62ed316cda7b75735b20307b47e\``
    );
    await queryRunner.query(`ALTER TABLE \`callout\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`nameID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` CHANGE \`visibility\` \`visibility\` text NOT NULL DEFAULT 'draft'`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` CHANGE \`sortOrder\` \`sortOrder\` int NOT NULL DEFAULT '10'`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` CHANGE \`publishedDate\` \`publishedDate\` datetime NOT NULL`
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
      `ALTER TABLE \`calendar_event\` DROP COLUMN \`nameID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD \`nameID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP COLUMN \`type\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD \`type\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` CHANGE \`startDate\` \`startDate\` datetime NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` CHANGE \`wholeDay\` \`wholeDay\` tinyint NOT NULL DEFAULT 1`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` CHANGE \`multipleDays\` \`multipleDays\` tinyint NOT NULL DEFAULT 1`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` CHANGE \`durationMinutes\` \`durationMinutes\` int NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` CHANGE \`durationDays\` \`durationDays\` int NOT NULL`
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
      `ALTER TABLE \`innovation_flow\` DROP COLUMN \`spaceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD \`spaceID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP COLUMN \`type\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD \`type\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD UNIQUE INDEX \`IDX_a6e050daa4c7a3ab1e411c3651\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD UNIQUE INDEX \`IDX_96a8cbe1706f459fd7d883be9b\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`feature_flag\` CHANGE \`enabled\` \`enabled\` tinyint NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`license\` CHANGE \`visibility\` \`visibility\` varchar(36) NOT NULL DEFAULT 'active'`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_3ef80ef55ba1a1d45e625ea8389\``
    );
    await queryRunner.query(`ALTER TABLE \`space\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`nameID\` varchar(255) NOT NULL`
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
    await queryRunner.query(`ALTER TABLE \`project\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD \`nameID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`project\` DROP COLUMN \`spaceID\``);
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD \`spaceID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD UNIQUE INDEX \`IDX_6814b5d57d931283b1a2a1908c\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_fa617e79d6b2926edc7b4a3878f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`nameID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`nameID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`spaceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`spaceID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD UNIQUE INDEX \`IDX_28129cec24e65cc8340ecd1284\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD UNIQUE INDEX \`IDX_fa617e79d6b2926edc7b4a3878\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD UNIQUE INDEX \`IDX_a37ebd95962285f8339bffb157\` (\`innovationFlowId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD UNIQUE INDEX \`IDX_8488dda5c509a57e6070e8c3b0\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_d4551f18fed106ae2e20c70f7cb\``
    );
    await queryRunner.query(`ALTER TABLE \`challenge\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`nameID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD UNIQUE INDEX \`IDX_eedbe52ec6041ac337528d3dd0\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD UNIQUE INDEX \`IDX_d4551f18fed106ae2e20c70f7c\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD UNIQUE INDEX \`IDX_88592bee71718eec66a3bfc63f\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD UNIQUE INDEX \`IDX_0ec10c5ca99e2b7bbdeeaf6ff0\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD UNIQUE INDEX \`IDX_e62d620c2e7ea854d8832db720\` (\`innovationFlowId\`)`
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
      `CREATE UNIQUE INDEX \`REL_f2f48b57269987b13b415a0058\` ON \`storage_bucket\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_432056041df0e4337b17ff7b09\` ON \`profile\` (\`locationId\`)`
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
      `CREATE UNIQUE INDEX \`REL_e85c3329a73901499b08268da7\` ON \`whiteboard_checkout\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_740508d60c7a6de2c2a706f202\` ON \`whiteboard_checkout\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_d3b86160bb7d704212382b0ca4\` ON \`whiteboard\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_3f9e9e2798d2a4d84b16ee8477\` ON \`whiteboard\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_4db6290f461fa726e86cf3d634\` ON \`whiteboard\` (\`checkoutId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_62712f63939a6d56fd5c334ee3\` ON \`callout_framing\` (\`whiteboardRtId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_479f799f0d86e43c9d8623e827\` ON \`callout_template\` (\`contributionDefaultsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_29ff764dc6de1a9dc289cbfb01\` ON \`callout_template\` (\`contributionPolicyId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_eb0176ef4b98c143322aa6f809\` ON \`templates_set\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_3879db652f2421337691219ace\` ON \`library\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_8af8122897b05315e7eb892525\` ON \`innovation_pack\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_d1d94dd8e0c417b4188a05ccbc\` ON \`room\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_2d8a3ca181c3f0346817685d21\` ON \`discussion\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_5337074c9b818bb63e6f314c80\` ON \`discussion\` (\`commentsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_eb99e588873c788a68a035478a\` ON \`communication\` (\`updatesId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_9f621c51dd854634d8766a9cfa\` ON \`platform\` (\`authorizationId\`)`
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
      `CREATE UNIQUE INDEX \`REL_028322b763dc94242dc9f638f9\` ON \`user\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_10458c50c10436b6d589b40e5c\` ON \`user\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_b132226941570cb650a4023d49\` ON \`invitation\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_b0c80ccf319a1c7a7af12b3998\` ON \`invitation\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_7fbe50fa78a37776ad962cb764\` ON \`community\` (\`communicationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c7d74dd6b92d4202c705cd3676\` ON \`community\` (\`applicationFormId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_3823de95920943655430125fa9\` ON \`community\` (\`policyId\`)`
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
      `CREATE UNIQUE INDEX \`REL_b7ece56376ac7ca0b9a56c33b3\` ON \`collaboration\` (\`tagsetTemplateSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_f67a2d25c945269d602c182fbc\` ON \`collaboration\` (\`timelineId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a6e050daa4c7a3ab1e411c3651\` ON \`innovation_flow\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_96a8cbe1706f459fd7d883be9b\` ON \`innovation_flow\` (\`profileId\`)`
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
      `CREATE UNIQUE INDEX \`REL_85e1d68e22378dc2e81bce8d3a\` ON \`space\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_3ef80ef55ba1a1d45e625ea838\` ON \`space\` (\`licenseId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_ef077d5cc64cd388217db42ea9\` ON \`space\` (\`templatesSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_980c4643d7d9de1b97bc39f518\` ON \`space\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_6814b5d57d931283b1a2a1908c\` ON \`project\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_28129cec24e65cc8340ecd1284\` ON \`opportunity\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_fa617e79d6b2926edc7b4a3878\` ON \`opportunity\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a37ebd95962285f8339bffb157\` ON \`opportunity\` (\`innovationFlowId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_8488dda5c509a57e6070e8c3b0\` ON \`opportunity\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_eedbe52ec6041ac337528d3dd0\` ON \`challenge\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_d4551f18fed106ae2e20c70f7c\` ON \`challenge\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_88592bee71718eec66a3bfc63f\` ON \`challenge\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_0ec10c5ca99e2b7bbdeeaf6ff0\` ON \`challenge\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_e62d620c2e7ea854d8832db720\` ON \`challenge\` (\`innovationFlowId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset_template\` ADD CONSTRAINT \`FK_96f23f044acf305c1699e0319d2\` FOREIGN KEY (\`tagsetTemplateSetId\`) REFERENCES \`tagset_template_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
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
      `ALTER TABLE \`storage_bucket\` ADD CONSTRAINT \`FK_f2f48b57269987b13b415a00587\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_432056041df0e4337b17ff7b09d\` FOREIGN KEY (\`locationId\`) REFERENCES \`location\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
      `ALTER TABLE \`whiteboard_checkout\` ADD CONSTRAINT \`FK_e85c3329a73901499b08268da7b\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` ADD CONSTRAINT \`FK_740508d60c7a6de2c2a706f202f\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD CONSTRAINT \`FK_d3b86160bb7d704212382b0ca44\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD CONSTRAINT \`FK_3f9e9e2798d2a4d84b16ee8477c\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD CONSTRAINT \`FK_4db6290f461fa726e86cf3d6343\` FOREIGN KEY (\`checkoutId\`) REFERENCES \`whiteboard_checkout\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD CONSTRAINT \`FK_62712f63939a6d56fd5c334ee3f\` FOREIGN KEY (\`whiteboardRtId\`) REFERENCES \`whiteboard_rt\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD CONSTRAINT \`FK_479f799f0d86e43c9d8623e8277\` FOREIGN KEY (\`contributionDefaultsId\`) REFERENCES \`callout_contribution_defaults\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD CONSTRAINT \`FK_29ff764dc6de1a9dc289cbfb01b\` FOREIGN KEY (\`contributionPolicyId\`) REFERENCES \`callout_contribution_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` ADD CONSTRAINT \`FK_eb0176ef4b98c143322aa6f8090\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`library\` ADD CONSTRAINT \`FK_3879db652f2421337691219ace8\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`library\` ADD CONSTRAINT \`FK_112e1c016f3cdbcea1d45118ee0\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_8af8122897b05315e7eb8925253\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_5facd6d188068a5a1c5b6f07fc3\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_03d66ad59e0d7d572239efd487d\` FOREIGN KEY (\`libraryId\`) REFERENCES \`library\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_a1441e46c8d36090e1f6477cea5\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` ADD CONSTRAINT \`FK_d1d94dd8e0c417b4188a05ccbca\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_2d8a3ca181c3f0346817685d21d\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_5337074c9b818bb63e6f314c808\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD CONSTRAINT \`FK_eb99e588873c788a68a035478ab\` FOREIGN KEY (\`updatesId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_9f621c51dd854634d8766a9cfaf\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_3eb4c1d5063176a184485399f15\` FOREIGN KEY (\`communicationId\`) REFERENCES \`communication\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_f516dd9a46616999c7e9a6adc15\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
      `ALTER TABLE \`user_group\` ADD CONSTRAINT \`FK_694ebec955a90e999d9926b7da8\` FOREIGN KEY (\`organizationId\`) REFERENCES \`organization\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_028322b763dc94242dc9f638f9b\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_10458c50c10436b6d589b40e5ca\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
      `ALTER TABLE \`invitation_external\` ADD CONSTRAINT \`FK_2a985f774bd4de2a9aead6bd5b1\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_7fbe50fa78a37776ad962cb7643\` FOREIGN KEY (\`communicationId\`) REFERENCES \`communication\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_c7d74dd6b92d4202c705cd36769\` FOREIGN KEY (\`applicationFormId\`) REFERENCES \`form\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_3823de95920943655430125fa93\` FOREIGN KEY (\`policyId\`) REFERENCES \`community_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
      `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_b7ece56376ac7ca0b9a56c33b3a\` FOREIGN KEY (\`tagsetTemplateSetId\`) REFERENCES \`tagset_template_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_f67a2d25c945269d602c182fbc0\` FOREIGN KEY (\`timelineId\`) REFERENCES \`timeline\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD CONSTRAINT \`FK_a6e050daa4c7a3ab1e411c36517\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD CONSTRAINT \`FK_96a8cbe1706f459fd7d883be9bd\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`feature_flag\` ADD CONSTRAINT \`FK_f9ff1ef0f5f55bb397cf625375b\` FOREIGN KEY (\`licenseId\`) REFERENCES \`license\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_8d03fd2c8e8411ec9192c79cd99\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_b4250035291aac1329d59224a96\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_85e1d68e22378dc2e81bce8d3a7\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_3ef80ef55ba1a1d45e625ea8389\` FOREIGN KEY (\`licenseId\`) REFERENCES \`license\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_ef077d5cc64cd388217db42ea92\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_980c4643d7d9de1b97bc39f5185\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD CONSTRAINT \`FK_6814b5d57d931283b1a2a1908c9\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_28129cec24e65cc8340ecd12844\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_fa617e79d6b2926edc7b4a3878f\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_a37ebd95962285f8339bffb157f\` FOREIGN KEY (\`innovationFlowId\`) REFERENCES \`innovation_flow\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_8488dda5c509a57e6070e8c3b0d\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_eedbe52ec6041ac337528d3dd02\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_d4551f18fed106ae2e20c70f7cb\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_dfc931252a77168109dac56ba05\` FOREIGN KEY (\`parentSpaceId\`) REFERENCES \`space\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_88592bee71718eec66a3bfc63fd\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_0ec10c5ca99e2b7bbdeeaf6ff09\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_e62d620c2e7ea854d8832db720e\` FOREIGN KEY (\`innovationFlowId\`) REFERENCES \`innovation_flow\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_e62d620c2e7ea854d8832db720e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_0ec10c5ca99e2b7bbdeeaf6ff09\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_88592bee71718eec66a3bfc63fd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_dfc931252a77168109dac56ba05\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_d4551f18fed106ae2e20c70f7cb\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_eedbe52ec6041ac337528d3dd02\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_8488dda5c509a57e6070e8c3b0d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_a37ebd95962285f8339bffb157f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_fa617e79d6b2926edc7b4a3878f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_28129cec24e65cc8340ecd12844\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP FOREIGN KEY \`FK_6814b5d57d931283b1a2a1908c9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_980c4643d7d9de1b97bc39f5185\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_ef077d5cc64cd388217db42ea92\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_3ef80ef55ba1a1d45e625ea8389\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_85e1d68e22378dc2e81bce8d3a7\``
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
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_b4250035291aac1329d59224a96\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_8d03fd2c8e8411ec9192c79cd99\``
    );
    await queryRunner.query(
      `ALTER TABLE \`feature_flag\` DROP FOREIGN KEY \`FK_f9ff1ef0f5f55bb397cf625375b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP FOREIGN KEY \`FK_96a8cbe1706f459fd7d883be9bd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP FOREIGN KEY \`FK_a6e050daa4c7a3ab1e411c36517\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_f67a2d25c945269d602c182fbc0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_b7ece56376ac7ca0b9a56c33b3a\``
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
      `ALTER TABLE \`post\` DROP FOREIGN KEY \`FK_042b9825d770d6b3009ae206c2f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` DROP FOREIGN KEY \`FK_970844fcd10c2b6df7c1b49eacf\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` DROP FOREIGN KEY \`FK_390343b22abec869bf800419333\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_3823de95920943655430125fa93\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_c7d74dd6b92d4202c705cd36769\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_7fbe50fa78a37776ad962cb7643\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation_external\` DROP FOREIGN KEY \`FK_2a985f774bd4de2a9aead6bd5b1\``
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
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_10458c50c10436b6d589b40e5ca\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_028322b763dc94242dc9f638f9b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP FOREIGN KEY \`FK_694ebec955a90e999d9926b7da8\``
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
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_f516dd9a46616999c7e9a6adc15\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_3eb4c1d5063176a184485399f15\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_9f621c51dd854634d8766a9cfaf\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP FOREIGN KEY \`FK_eb99e588873c788a68a035478ab\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_5337074c9b818bb63e6f314c808\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_2d8a3ca181c3f0346817685d21d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` DROP FOREIGN KEY \`FK_d1d94dd8e0c417b4188a05ccbca\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_a1441e46c8d36090e1f6477cea5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_03d66ad59e0d7d572239efd487d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_5facd6d188068a5a1c5b6f07fc3\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_8af8122897b05315e7eb8925253\``
    );
    await queryRunner.query(
      `ALTER TABLE \`library\` DROP FOREIGN KEY \`FK_112e1c016f3cdbcea1d45118ee0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`library\` DROP FOREIGN KEY \`FK_3879db652f2421337691219ace8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` DROP FOREIGN KEY \`FK_eb0176ef4b98c143322aa6f8090\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP FOREIGN KEY \`FK_29ff764dc6de1a9dc289cbfb01b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP FOREIGN KEY \`FK_479f799f0d86e43c9d8623e8277\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP FOREIGN KEY \`FK_62712f63939a6d56fd5c334ee3f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP FOREIGN KEY \`FK_4db6290f461fa726e86cf3d6343\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP FOREIGN KEY \`FK_3f9e9e2798d2a4d84b16ee8477c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP FOREIGN KEY \`FK_d3b86160bb7d704212382b0ca44\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` DROP FOREIGN KEY \`FK_740508d60c7a6de2c2a706f202f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` DROP FOREIGN KEY \`FK_e85c3329a73901499b08268da7b\``
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
      `ALTER TABLE \`profile\` DROP FOREIGN KEY \`FK_432056041df0e4337b17ff7b09d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` DROP FOREIGN KEY \`FK_f2f48b57269987b13b415a00587\``
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
      `ALTER TABLE \`tagset_template\` DROP FOREIGN KEY \`FK_96f23f044acf305c1699e0319d2\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_e62d620c2e7ea854d8832db720\` ON \`challenge\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_0ec10c5ca99e2b7bbdeeaf6ff0\` ON \`challenge\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_88592bee71718eec66a3bfc63f\` ON \`challenge\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_d4551f18fed106ae2e20c70f7c\` ON \`challenge\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_eedbe52ec6041ac337528d3dd0\` ON \`challenge\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_8488dda5c509a57e6070e8c3b0\` ON \`opportunity\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a37ebd95962285f8339bffb157\` ON \`opportunity\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_fa617e79d6b2926edc7b4a3878\` ON \`opportunity\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_28129cec24e65cc8340ecd1284\` ON \`opportunity\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6814b5d57d931283b1a2a1908c\` ON \`project\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_980c4643d7d9de1b97bc39f518\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_ef077d5cc64cd388217db42ea9\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_3ef80ef55ba1a1d45e625ea838\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_85e1d68e22378dc2e81bce8d3a\` ON \`space\``
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
      `DROP INDEX \`REL_96a8cbe1706f459fd7d883be9b\` ON \`innovation_flow\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a6e050daa4c7a3ab1e411c3651\` ON \`innovation_flow\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_f67a2d25c945269d602c182fbc\` ON \`collaboration\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b7ece56376ac7ca0b9a56c33b3\` ON \`collaboration\``
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
      `DROP INDEX \`REL_042b9825d770d6b3009ae206c2\` ON \`post\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_970844fcd10c2b6df7c1b49eac\` ON \`post\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_390343b22abec869bf80041933\` ON \`post\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_3823de95920943655430125fa9\` ON \`community\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c7d74dd6b92d4202c705cd3676\` ON \`community\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_7fbe50fa78a37776ad962cb764\` ON \`community\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b0c80ccf319a1c7a7af12b3998\` ON \`invitation\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b132226941570cb650a4023d49\` ON \`invitation\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_10458c50c10436b6d589b40e5c\` ON \`user\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_028322b763dc94242dc9f638f9\` ON \`user\``
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
      `DROP INDEX \`REL_9f621c51dd854634d8766a9cfa\` ON \`platform\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_eb99e588873c788a68a035478a\` ON \`communication\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_5337074c9b818bb63e6f314c80\` ON \`discussion\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_2d8a3ca181c3f0346817685d21\` ON \`discussion\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_d1d94dd8e0c417b4188a05ccbc\` ON \`room\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_8af8122897b05315e7eb892525\` ON \`innovation_pack\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_3879db652f2421337691219ace\` ON \`library\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_eb0176ef4b98c143322aa6f809\` ON \`templates_set\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_29ff764dc6de1a9dc289cbfb01\` ON \`callout_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_479f799f0d86e43c9d8623e827\` ON \`callout_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_62712f63939a6d56fd5c334ee3\` ON \`callout_framing\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_4db6290f461fa726e86cf3d634\` ON \`whiteboard\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_3f9e9e2798d2a4d84b16ee8477\` ON \`whiteboard\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_d3b86160bb7d704212382b0ca4\` ON \`whiteboard\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_740508d60c7a6de2c2a706f202\` ON \`whiteboard_checkout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_e85c3329a73901499b08268da7\` ON \`whiteboard_checkout\``
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
      `DROP INDEX \`REL_432056041df0e4337b17ff7b09\` ON \`profile\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_f2f48b57269987b13b415a0058\` ON \`storage_bucket\``
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
      `ALTER TABLE \`challenge\` DROP INDEX \`IDX_e62d620c2e7ea854d8832db720\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP INDEX \`IDX_0ec10c5ca99e2b7bbdeeaf6ff0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP INDEX \`IDX_88592bee71718eec66a3bfc63f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP INDEX \`IDX_d4551f18fed106ae2e20c70f7c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP INDEX \`IDX_eedbe52ec6041ac337528d3dd0\``
    );
    await queryRunner.query(`ALTER TABLE \`challenge\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`nameID\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_d4551f18fed106ae2e20c70f7cb\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP INDEX \`IDX_8488dda5c509a57e6070e8c3b0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP INDEX \`IDX_a37ebd95962285f8339bffb157\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP INDEX \`IDX_fa617e79d6b2926edc7b4a3878\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP INDEX \`IDX_28129cec24e65cc8340ecd1284\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`spaceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`spaceID\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`nameID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`nameID\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_fa617e79d6b2926edc7b4a3878f\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP INDEX \`IDX_6814b5d57d931283b1a2a1908c\``
    );
    await queryRunner.query(`ALTER TABLE \`project\` DROP COLUMN \`spaceID\``);
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD \`spaceID\` char(36) NULL`
    );
    await queryRunner.query(`ALTER TABLE \`project\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD \`nameID\` varchar(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP INDEX \`IDX_980c4643d7d9de1b97bc39f518\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP INDEX \`IDX_ef077d5cc64cd388217db42ea9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP INDEX \`IDX_3ef80ef55ba1a1d45e625ea838\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP INDEX \`IDX_85e1d68e22378dc2e81bce8d3a\``
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
    await queryRunner.query(`ALTER TABLE \`space\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`nameID\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_3ef80ef55ba1a1d45e625ea8389\` FOREIGN KEY (\`licenseId\`) REFERENCES \`license\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`license\` CHANGE \`visibility\` \`visibility\` varchar(36) NULL DEFAULT 'active'`
    );
    await queryRunner.query(
      `ALTER TABLE \`feature_flag\` CHANGE \`enabled\` \`enabled\` tinyint(1) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP INDEX \`IDX_96a8cbe1706f459fd7d883be9b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP INDEX \`IDX_a6e050daa4c7a3ab1e411c3651\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP COLUMN \`type\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD \`type\` varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP COLUMN \`spaceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD \`spaceID\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP INDEX \`IDX_f67a2d25c945269d602c182fbc\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP INDEX \`IDX_b7ece56376ac7ca0b9a56c33b3\``
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
      `ALTER TABLE \`calendar_event\` CHANGE \`durationDays\` \`durationDays\` int NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` CHANGE \`durationMinutes\` \`durationMinutes\` int NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` CHANGE \`multipleDays\` \`multipleDays\` tinyint NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` CHANGE \`wholeDay\` \`wholeDay\` tinyint NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` CHANGE \`startDate\` \`startDate\` datetime(6) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP COLUMN \`type\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD \`type\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP COLUMN \`nameID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD \`nameID\` varchar(36) NOT NULL`
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
      `ALTER TABLE \`callout\` CHANGE \`publishedDate\` \`publishedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` CHANGE \`sortOrder\` \`sortOrder\` int NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` CHANGE \`visibility\` \`visibility\` text NOT NULL DEFAULT '_utf8mb4\'draft\''`
    );
    await queryRunner.query(`ALTER TABLE \`callout\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`nameID\` varchar(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_62ed316cda7b75735b20307b47e\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_36b0da55acff774d0845aeb55f2\` FOREIGN KEY (\`contributionDefaultsId\`) REFERENCES \`callout_contribution_defaults\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_1e740008a7e1512966e3b084148\` FOREIGN KEY (\`contributionPolicyId\`) REFERENCES \`callout_contribution_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
    await queryRunner.query(`ALTER TABLE \`post\` DROP COLUMN \`type\``);
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD \`type\` varchar(255) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`post\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD \`nameID\` varchar(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP INDEX \`IDX_3823de95920943655430125fa9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP INDEX \`IDX_c7d74dd6b92d4202c705cd3676\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP INDEX \`IDX_7fbe50fa78a37776ad962cb764\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`spaceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`spaceID\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_7fbe50fa78a37776ad962cb7643\` FOREIGN KEY (\`communicationId\`) REFERENCES \`communication\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP COLUMN \`communityId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD \`communityId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP INDEX \`IDX_b0c80ccf319a1c7a7af12b3998\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP COLUMN \`lifecycleId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD \`lifecycleId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_b0c80ccf319a1c7a7af12b3998\` ON \`invitation\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP INDEX \`IDX_b132226941570cb650a4023d49\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_b132226941570cb650a4023d49\` ON \`invitation\` (\`authorizationId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`invitation\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD \`id\` varchar(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD CONSTRAINT \`FK_b0c80ccf319a1c7a7af12b39987\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD CONSTRAINT \`FK_b132226941570cb650a4023d493\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`form\` CHANGE \`questions\` \`questions\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_policy\` CHANGE \`host\` \`host\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_policy\` CHANGE \`admin\` \`admin\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_policy\` CHANGE \`lead\` \`lead\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_policy\` CHANGE \`member\` \`member\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP COLUMN \`spaceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD \`spaceID\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP INDEX \`IDX_10458c50c10436b6d589b40e5c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP INDEX \`IDX_028322b763dc94242dc9f638f9\``
    );
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`nameID\` varchar(36) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`nvp\` DROP COLUMN \`value\``);
    await queryRunner.query(
      `ALTER TABLE \`nvp\` ADD \`value\` varchar(512) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP COLUMN \`spaceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD \`spaceID\` char(36) NULL`
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
      `ALTER TABLE \`organization\` DROP COLUMN \`nameID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD \`nameID\` varchar(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`credential\` DROP COLUMN \`resourceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`credential\` ADD \`resourceID\` char(36) NOT NULL`
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
      `ALTER TABLE \`organization_verification\` DROP COLUMN \`organizationID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` ADD \`organizationID\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP INDEX \`IDX_9f621c51dd854634d8766a9cfa\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP INDEX \`IDX_eb99e588873c788a68a035478a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` CHANGE \`discussionCategories\` \`discussionCategories\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP COLUMN \`spaceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD \`spaceID\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP INDEX \`IDX_5337074c9b818bb63e6f314c80\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP INDEX \`IDX_2d8a3ca181c3f0346817685d21\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP COLUMN \`nameID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD \`nameID\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_2d8a3ca181c3f0346817685d21d\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` DROP INDEX \`IDX_d1d94dd8e0c417b4188a05ccbc\``
    );
    await queryRunner.query(`ALTER TABLE \`room\` DROP COLUMN \`type\``);
    await queryRunner.query(
      `ALTER TABLE \`room\` ADD \`type\` varchar(255) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`activity\` DROP COLUMN \`type\``);
    await queryRunner.query(
      `ALTER TABLE \`activity\` ADD \`type\` varchar(128) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`activity\` DROP COLUMN \`description\``
    );
    await queryRunner.query(
      `ALTER TABLE \`activity\` ADD \`description\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`activity\` CHANGE \`visibility\` \`visibility\` tinyint(1) NULL DEFAULT '1'`
    );
    await queryRunner.query(
      `ALTER TABLE \`activity\` CHANGE \`collaborationID\` \`collaborationID\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`activity\` CHANGE \`parentID\` \`parentID\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`activity\` CHANGE \`resourceID\` \`resourceID\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`activity\` CHANGE \`triggeredBy\` \`triggeredBy\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`activity\` DROP INDEX \`IDX_07a39cea9426b689be25fd61de\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP INDEX \`IDX_8af8122897b05315e7eb892525\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP COLUMN \`nameID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD \`nameID\` varchar(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`library\` DROP INDEX \`IDX_3879db652f2421337691219ace\``
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` DROP INDEX \`IDX_eb0176ef4b98c143322aa6f809\``
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` CHANGE \`policy\` \`policy\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP INDEX \`IDX_29ff764dc6de1a9dc289cbfb01\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP INDEX \`IDX_479f799f0d86e43c9d8623e827\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution_policy\` CHANGE \`state\` \`state\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP INDEX \`IDX_62712f63939a6d56fd5c334ee3\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD CONSTRAINT \`FK_62712f63939a6d56fd5c334ee3f\` FOREIGN KEY (\`whiteboardRtId\`) REFERENCES \`whiteboard_rt\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_rt\` CHANGE \`contentUpdatePolicy\` \`contentUpdatePolicy\` varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP INDEX \`IDX_4db6290f461fa726e86cf3d634\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP INDEX \`IDX_3f9e9e2798d2a4d84b16ee8477\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP INDEX \`IDX_d3b86160bb7d704212382b0ca4\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP COLUMN \`nameID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD \`nameID\` varchar(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` DROP INDEX \`IDX_740508d60c7a6de2c2a706f202\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` DROP INDEX \`IDX_e85c3329a73901499b08268da7\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP INDEX \`IDX_bd591d7403dabe091f6a116975\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP INDEX \`IDX_3aec561629db1d65a9b2b3a788\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP COLUMN \`type\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD \`type\` varchar(128) NOT NULL`
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
      `ALTER TABLE \`innovation_hub\` DROP INDEX \`IDX_8f35d04d098bb6c7c57a9a83ac\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` DROP COLUMN \`subdomain\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD \`subdomain\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_8f35d04d098bb6c7c57a9a83ac\` ON \`innovation_hub\` (\`subdomain\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP INDEX \`IDX_432056041df0e4337b17ff7b09\``
    );
    await queryRunner.query(`ALTER TABLE \`profile\` DROP COLUMN \`tagline\``);
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`tagline\` varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` DROP INDEX \`IDX_f2f48b57269987b13b415a0058\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` CHANGE \`maxFileSize\` \`maxFileSize\` int NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` CHANGE \`allowedMimeTypes\` \`allowedMimeTypes\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP INDEX \`IDX_9fb9257b14ec21daf5bc9aa4c8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP INDEX \`IDX_d9e2dfcccf59233c17cc6bc641\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` CHANGE \`externalID\` \`externalID\` varchar(128) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` CHANGE \`size\` \`size\` int NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` CHANGE \`mimeType\` \`mimeType\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP COLUMN \`displayName\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD \`displayName\` varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` DROP COLUMN \`postalCode\``
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` ADD \`postalCode\` varchar(128) NOT NULL DEFAULT ''`
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` DROP COLUMN \`stateOrProvince\``
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` ADD \`stateOrProvince\` varchar(128) NOT NULL DEFAULT ''`
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` DROP COLUMN \`addressLine2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` ADD \`addressLine2\` varchar(128) NOT NULL DEFAULT ''`
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` DROP COLUMN \`addressLine1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` ADD \`addressLine1\` varchar(128) NOT NULL DEFAULT ''`
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` CHANGE \`country\` \`country\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` CHANGE \`city\` \`city\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP INDEX \`IDX_4fbd109f9bb84f58b7a3c60649\``
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP COLUMN \`aspectRatio\``
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD \`aspectRatio\` float(12) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` CHANGE \`uri\` \`uri\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` CHANGE \`type\` \`type\` varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset_template\` CHANGE \`allowedValues\` \`allowedValues\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset_template\` CHANGE \`type\` \`type\` varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset_template\` CHANGE \`name\` \`name\` varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`spaceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP COLUMN \`states\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` DROP COLUMN \`whiteboardID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`spaceId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD \`lifecycleId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` ADD \`whiteboardId\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` CHANGE \`spaceID\` \`spaceId\` char(36) NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_eedbe52ec6041ac337528d3dd0\` ON \`challenge\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_e62d620c2e7ea854d8832db720\` ON \`challenge\` (\`innovationFlowId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_e3b287bbffe59aba827d97d5fa\` ON \`challenge\` (\`rowId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_d4551f18fed106ae2e20c70f7c\` ON \`challenge\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_88592bee71718eec66a3bfc63f\` ON \`challenge\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_0ec10c5ca99e2b7bbdeeaf6ff0\` ON \`challenge\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_fa617e79d6b2926edc7b4a3878\` ON \`opportunity\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_a37ebd95962285f8339bffb157\` ON \`opportunity\` (\`innovationFlowId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_8488dda5c509a57e6070e8c3b0\` ON \`opportunity\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_313c12afe69143a9ee3779b4f6\` ON \`opportunity\` (\`rowId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_28129cec24e65cc8340ecd1284\` ON \`opportunity\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_6814b5d57d931283b1a2a1908c\` ON \`project\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_f5ad15bcb06a95c2a109fbcce2\` ON \`space\` (\`communityId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_b0c3f360534db92017e36a00bb\` ON \`space\` (\`agentId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_6db8627abbf00b1b986e359054\` ON \`space\` (\`contextId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_17a161eef37c9f07186532ab75\` ON \`space\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_ef077d5cc64cd388217db42ea9\` ON \`space\` (\`templatesSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_ea06eb8894469a0f262d929bf0\` ON \`space\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_cc0b08eb9679d3daa95153c2af\` ON \`space\` (\`contextId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_b4250035291aac1329d59224a9\` ON \`space\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_9c664d684f987a735678b0ba82\` ON \`space\` (\`agentId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_99990355b4e9bd6b02c66507aa\` ON \`space\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_980c4643d7d9de1b97bc39f518\` ON \`space\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_8d03fd2c8e8411ec9192c79cd9\` ON \`space\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_85e1d68e22378dc2e81bce8d3a\` ON \`space\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_68fa2c2b00cc1ed77e7c225e8b\` ON \`space\` (\`communityId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_6325f4ef25c4e07e723a96ed37\` ON \`space\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_3ef80ef55ba1a1d45e625ea838\` ON \`space\` (\`licenseId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_98a7abc9f297ffcacb53087dc8\` ON \`innovation_flow\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_a6e050daa4c7a3ab1e411c3651\` ON \`innovation_flow\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_96a8cbe1706f459fd7d883be9b\` ON \`innovation_flow\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_0af5c8e5c0a2f7858ae0a40c04\` ON \`innovation_flow\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_f67a2d25c945269d602c182fbc\` ON \`collaboration\` (\`timelineId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_b7ece56376ac7ca0b9a56c33b3\` ON \`collaboration\` (\`tagsetTemplateSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_e6203bc09ec8b93debeb3a44cb9\` ON \`timeline\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_10ed346b16ca044cd84fb1c4034\` ON \`timeline\` (\`calendarId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_5fe58ece01b48496aebc04733d\` ON \`timeline\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_56aae15a664b2889a1a11c2cf8\` ON \`timeline\` (\`calendarId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_94994efc5eb5936ed70f2c55903\` ON \`calendar\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_6e74d59afda096b68d12a69969\` ON \`calendar\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a3693e1d3472c5ef8b00e51acfd\` ON \`calendar_event\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_222adf666c59b9eb5ce394714cf\` ON \`calendar_event\` (\`commentsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_22222ccdda9ba57d8e3a634cd8\` ON \`calendar_event\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_b5069b11030e9608ee4468f850\` ON \`calendar_event\` (\`commentsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_9349e137959f3ca5818c2e62b3\` ON \`calendar_event\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_8ee86afa2808a4ab523b9ee6c5\` ON \`calendar_event\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_111838434c7198a323ea6f475fb\` ON \`calendar_event\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_cf776244b01436d8ca5cc76284\` ON \`callout\` (\`framingId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_62ed316cda7b75735b20307b47\` ON \`callout\` (\`commentsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_36b0da55acff774d0845aeb55f\` ON \`callout\` (\`contributionDefaultsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_1e740008a7e1512966e3b08414\` ON \`callout\` (\`contributionPolicyId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c52470717008d58ec6d76b12ff\` ON \`post\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c4fb636888fc391cf1d7406e89\` ON \`post\` (\`commentsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_c4fb636888fc391cf1d7406e89\` ON \`post\` (\`commentsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_970844fcd10c2b6df7c1b49eac\` ON \`post\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_67663901817dd09d5906537e088\` ON \`post\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_390343b22abec869bf80041933\` ON \`post\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_042b9825d770d6b3009ae206c2\` ON \`post\` (\`commentsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_c9ff67519d26140f98265a542e\` ON \`community\` (\`policyId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_c7d74dd6b92d4202c705cd3676\` ON \`community\` (\`applicationFormId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_7fbe50fa78a37776ad962cb764\` ON \`community\` (\`communicationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_3823de95920943655430125fa9\` ON \`community\` (\`policyId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_b132226941570cb650a4023d49\` ON \`invitation\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_b0c80ccf319a1c7a7af12b3998\` ON \`invitation\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_88880355b4e9bd6b02c66507aa\` ON \`user\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_10458c50c10436b6d589b40e5c\` ON \`user\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_028322b763dc94242dc9f638f9\` ON \`user\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_badc07674ce4e44801e5a5f36c\` ON \`organization\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_95bbac07221e98072beafa6173\` ON \`organization\` (\`verificationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_7671a7e33f6665764f4534a596\` ON \`organization\` (\`agentId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_037ba4b170844c039e74aa22ec\` ON \`organization\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_e0e150e4f11d906b931b46a2d8\` ON \`organization\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_d2cb77c14644156ec8e865608e\` ON \`organization\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_95bbac07221e98072beafa6173\` ON \`organization\` (\`verificationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_7f1bec8979b57ed7ebd392a2ca\` ON \`organization\` (\`agentId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_5a72d5b37312bac2e0a0115718\` ON \`organization\` (\`verificationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_58fd47c4a6ac8df9fe2bcaed87\` ON \`organization\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_395aa74996a1f978b4969d114b\` ON \`organization\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_266bc44a18601f893566962df7\` ON \`organization\` (\`rowId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_8888dccdda9ba57d8e3a634cd8\` ON \`preference_set\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_8e76dcf171c45875c44febb1d8\` ON \`preference_set\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_49030bc57aa0f319cee7996fca\` ON \`preference\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_b4cf0f96bf08cf396f68355522\` ON \`preference\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_3795f9dd15ef3ef2dd1d27e309\` ON \`organization_verification\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_22be0d440df7972d9b3a94aa6d\` ON \`organization_verification\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_c66eddab0caacb1ef8d46bcafd\` ON \`organization_verification\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_1cc3b275fc2a9d9d9b0ae33b31\` ON \`organization_verification\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_44333ccdda9ba57d8e3a634cd8\` ON \`platform\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_eb99e588873c788a68a035478a\` ON \`communication\` (\`updatesId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_5337074c9b818bb63e6f314c80\` ON \`discussion\` (\`commentsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_2d8a3ca181c3f0346817685d21\` ON \`discussion\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_7777dccdda9ba57d8e3a634cd8\` ON \`room\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_d1d94dd8e0c417b4188a05ccbc\` ON \`room\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_0f03c61020ea0dfa0198c60304\` ON \`activity\` (\`rowId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_22222ccdda9ba57d8e3a634cd8\` ON \`innovation_pack\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_33333ccdda9ba57d8e3a634cd8\` ON \`library\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_66666ccdda9ba57d8e3a634cd8\` ON \`templates_set\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_eb0176ef4b98c143322aa6f809\` ON \`templates_set\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_bffd07760b73be1aad13b6d00c\` ON \`callout_template\` (\`contributionPolicyId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_83bbc10ba2ddee4502bf327f1f\` ON \`callout_template\` (\`contributionDefaultsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_479f799f0d86e43c9d8623e827\` ON \`callout_template\` (\`contributionDefaultsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_29ff764dc6de1a9dc289cbfb01\` ON \`callout_template\` (\`contributionPolicyId\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_62712f63939a6d56fd5c334ee3\` ON \`callout_framing\` (\`whiteboardRtId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_1dc9521a013c92854e92e09933\` ON \`whiteboard\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_08d1ccc94b008dbda894a3cfa2\` ON \`whiteboard\` (\`checkoutId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_d3b86160bb7d704212382b0ca4\` ON \`whiteboard\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_4db6290f461fa726e86cf3d634\` ON \`whiteboard\` (\`checkoutId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_3f9e9e2798d2a4d84b16ee8477\` ON \`whiteboard\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_1dc9521a013c92854e92e09933\` ON \`whiteboard\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_08d1ccc94b008dbda894a3cfa2\` ON \`whiteboard\` (\`checkoutId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_bd3c7c6c2dbc2a8daf4b1500a6\` ON \`whiteboard_checkout\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_353b042af56f01ce222f08abf4\` ON \`whiteboard_checkout\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_e85c3329a73901499b08268da7\` ON \`whiteboard_checkout\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_740508d60c7a6de2c2a706f202\` ON \`whiteboard_checkout\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_76542ccdda9ba57d8e3a634cd8\` ON \`innovation_flow_template\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_bd591d7403dabe091f6a116975\` ON \`innovation_flow_template\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_3aec561629db1d65a9b2b3a788\` ON \`innovation_flow_template\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_88888ccdda9ba57d8e3a634cd8\` ON \`whiteboard_template\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_cc2faf30ce52648db9299d7072\` ON \`whiteboard_template\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_5b4948db27c348e65055187d5e\` ON \`whiteboard_template\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_44447ccdda9ba57d8e3a634cd8\` ON \`post_template\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_c3bdb693adb031b6613edcef4f\` ON \`post_template\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_4a9c8cefc6c7e33aa728d22a90\` ON \`post_template\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_77777ca8ac212b8357637794d6\` ON \`profile\` (\`locationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_4a1c74fd2a61b32d9d9500e065\` ON \`profile\` (\`storageBucketId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_432056041df0e4337b17ff7b09\` ON \`profile\` (\`locationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_77994efc5eb5936ed70f2c55903\` ON \`storage_bucket\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_f2f48b57269987b13b415a0058\` ON \`storage_bucket\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_d9e2dfcccf59233c17cc6bc641\` ON \`document\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_9fb9257b14ec21daf5bc9aa4c8\` ON \`document\` (\`tagsetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_439d0b187986492b58178a82c3\` ON \`visual\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_4fbd109f9bb84f58b7a3c60649\` ON \`visual\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` ADD CONSTRAINT \`FK_fe50118fd82e7fe2f74f986a195\` FOREIGN KEY (\`nvpId\`) REFERENCES \`nvp\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` ADD CONSTRAINT \`FK_8495fae86f13836b0745642baa8\` FOREIGN KEY (\`applicationId\`) REFERENCES \`application\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_c890de5a08d363719a41703a638\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_81231450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_4c435130cde781b69259eec7d85\` FOREIGN KEY (\`innovationFlowId\`) REFERENCES \`innovation_flow\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_494b27cb13b59128fb24b365ca6\` FOREIGN KEY (\`parentSpaceId\`) REFERENCES \`space\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_2224d59c0b805c9c1ecb0070e16\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_91231450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_89894d59c0b805c9c1ecb0070e16\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_4840f1e3ae5509245bdb5c401f3\` FOREIGN KEY (\`innovationFlowId\`) REFERENCES \`innovation_flow\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD CONSTRAINT \`FK_49991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_f5ad15bcb06a95c2a109fbcce2a\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_b0c3f360534db92017e36a00bb2\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_71231450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_6db8627abbf00b1b986e359054f\` FOREIGN KEY (\`contextId\`) REFERENCES \`context\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_6bf7adf4308991457fdb04624e2\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_6325f4ef25c4e07e723a96ed37c\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_33336901817dd09d5906537e088\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_17a161eef37c9f07186532ab758\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_1114d59c0b805c9c1ecb0070e16\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`feature_flag\` ADD CONSTRAINT \`FK_7e3e0a8b6d3e9b4a3a0d6e3a3e3\` FOREIGN KEY (\`licenseId\`) REFERENCES \`license\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD CONSTRAINT \`FK_da7368698d32f610a5fc1880c7f\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD CONSTRAINT \`FK_da1a68698d32f610a5fc1880c7f\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD CONSTRAINT \`FK_4b4a68698d32f610a5fc1880c7f\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_3005ed9ce3f57c250c59d6d5065\` FOREIGN KEY (\`timelineId\`) REFERENCES \`timeline\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_1a135130cde781b69259eec7d85\` FOREIGN KEY (\`tagsetTemplateSetId\`) REFERENCES \`tagset_template_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` ADD CONSTRAINT \`FK_66355901817dd09d5906537e088\` FOREIGN KEY (\`calendarId\`) REFERENCES \`calendar\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` ADD CONSTRAINT \`FK_22443901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar\` ADD CONSTRAINT \`FK_33355901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_77755450cf75dc486700ca034c6\` FOREIGN KEY (\`calendarId\`) REFERENCES \`calendar\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_6a30f26ca267009fcf514e0e726\` FOREIGN KEY (\`createdBy\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_22255901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_157de0ce487e25bb69437e80b13\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_111838434c7198a323ea6f475fb\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD CONSTRAINT \`FK_c4fb636888fc391cf1d7406e891\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD CONSTRAINT \`FK_67663901817dd09d5906537e088\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD CONSTRAINT \`FK_00a8c330495ef844bfc6975ec89\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_35533901817dd09d5906537e088\` FOREIGN KEY (\`policyId\`) REFERENCES \`community_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_25543901817dd09d5906537e088\` FOREIGN KEY (\`applicationFormId\`) REFERENCES \`form\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation_external\` ADD CONSTRAINT \`FK_2a985f774bd4de2a9aead6bd5b1\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD CONSTRAINT \`FK_339c1fe2a9c5caef5b982303fb0\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_5ea996d22fbd9d522a59a39b74e\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_4444d59c0b805c9c1ecb0070e16\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD CONSTRAINT \`FK_2b8381df8c3a1680f50e4bc2351\` FOREIGN KEY (\`organizationId\`) REFERENCES \`organization\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_c07b5b4c96fa89cb80215827668\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_badc07674ce4e44801e5a5f36ce\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_95bbac07221e98072beafa61732\` FOREIGN KEY (\`verificationId\`) REFERENCES \`organization_verification\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_7671a7e33f6665764f4534a5967\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_3334d59c0b805c9c1ecb0070e16\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_037ba4b170844c039e74aa22ecd\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_set\` ADD CONSTRAINT \`FK_88885901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD CONSTRAINT \`FK_88881fbd1fef95a0540f7e7d1e2\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD CONSTRAINT \`FK_650fb4e564a8b4b4ac344270744\` FOREIGN KEY (\`preferenceDefinitionId\`) REFERENCES \`preference_definition\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD CONSTRAINT \`FK_49030bc57aa0f319cee7996fca1\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` ADD CONSTRAINT \`FK_3795f9dd15ef3ef2dd1d27e309c\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` ADD CONSTRAINT \`FK_22be0d440df7972d9b3a94aa6d5\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_5554d59c0b805c9c1ecb0070e16\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_55333901817dd09d5906537e088\` FOREIGN KEY (\`communicationId\`) REFERENCES \`communication\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_44333901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD CONSTRAINT \`FK_777750fa78a37776ad962cb7643\` FOREIGN KEY (\`updatesId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_345655450cf75dc486700ca034c6\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` ADD CONSTRAINT \`FK_77775901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_77777450cf75dc486700ca034c6\` FOREIGN KEY (\`libraryId\`) REFERENCES \`library\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_55555901817dd09d5906537e088\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_39991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_22222901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`library\` ADD CONSTRAINT \`FK_6664d59c0b805c9c1ecb0070e16\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`library\` ADD CONSTRAINT \`FK_33333901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` ADD CONSTRAINT \`FK_66666901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD CONSTRAINT \`FK_bffd07760b73be1aad13b6d00c3\` FOREIGN KEY (\`contributionPolicyId\`) REFERENCES \`callout_contribution_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD CONSTRAINT \`FK_83bbc10ba2ddee4502bf327f1f5\` FOREIGN KEY (\`contributionDefaultsId\`) REFERENCES \`callout_contribution_defaults\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD CONSTRAINT \`FK_29991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD CONSTRAINT \`FK_1dc9521a013c92854e92e099335\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD CONSTRAINT \`FK_08d1ccc94b008dbda894a3cfa20\` FOREIGN KEY (\`checkoutId\`) REFERENCES \`whiteboard_checkout\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` ADD CONSTRAINT \`FK_bd3c7c6c2dbc2a8daf4b1500a69\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` ADD CONSTRAINT \`FK_353b042af56f01ce222f08abf49\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD CONSTRAINT \`FK_79991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD CONSTRAINT \`FK_76546901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD CONSTRAINT \`FK_76546450cf75dc486700ca034c6\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD CONSTRAINT \`FK_69991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD CONSTRAINT \`FK_65556450cf75dc486700ca034c6\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD CONSTRAINT \`FK_45556901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD CONSTRAINT \`FK_66666450cf75dc486700ca034c6\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD CONSTRAINT \`FK_59991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD CONSTRAINT \`FK_44446901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_77777ca8ac212b8357637794d6f\` FOREIGN KEY (\`locationId\`) REFERENCES \`location\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` ADD CONSTRAINT \`FK_77755901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_3337f26ca267009fcf514e0e726\` FOREIGN KEY (\`createdBy\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_222838434c7198a323ea6f475fb\` FOREIGN KEY (\`tagsetId\`) REFERENCES \`tagset\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_11155901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_11155450cf75dc486700ca034c6\` FOREIGN KEY (\`storageBucketId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD CONSTRAINT \`FK_77771450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD CONSTRAINT \`FK_439d0b187986492b58178a82c3f\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` ADD CONSTRAINT \`FK_7ab35130cde781b69259eec7d85\` FOREIGN KEY (\`tagsetTemplateId\`) REFERENCES \`tagset_template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset_template\` ADD CONSTRAINT \`FK_9ad35130cde781b69259eec7d85\` FOREIGN KEY (\`tagsetTemplateSetId\`) REFERENCES \`tagset_template_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }
}

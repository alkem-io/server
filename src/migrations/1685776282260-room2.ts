import { MigrationInterface, QueryRunner } from 'typeorm';

export class room21685776282260 implements MigrationInterface {
  name = 'room21685776282260';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP FOREIGN KEY \`FK_439d0b187986492b58178a82c3f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP FOREIGN KEY \`FK_77771450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP FOREIGN KEY \`FK_77777ca8ac212b8357637794d6f\``
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
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_037ba4b170844c039e74aa22ecd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_51991450cf75dc486700ca034c6\``
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
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_5ea996d22fbd9d522a59a39b74e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`updates\` DROP FOREIGN KEY \`FK_77775901817dd09d5906537e087\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP FOREIGN KEY \`FK_777750fa78a37776ad962cb7643\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_25543901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_35533901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_29991450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` DROP FOREIGN KEY \`FK_77775901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_00a8c330495ef844bfc6975ec89\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_67663901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_c4fb636888fc391cf1d7406e891\``
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
      `ALTER TABLE \`templates_set\` DROP FOREIGN KEY \`FK_66666901817dd09d5906537e088\``
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
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_19991450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_22a2ec1b5bca6c54678ffb19eb0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_c506eee0b7d06523b2953d07337\``
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
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_11991450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_17a161eef37c9f07186532ab758\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_3005ed9ce3f57c250c59d6d5065\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_33336901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_6bf7adf4308991457fdb04624e2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_6db8627abbf00b1b986e359054f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_71231450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_b0c3f360534db92017e36a00bb2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_ec1a68698d32f610a5fc1880c7f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_f5ad15bcb06a95c2a109fbcce2a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP FOREIGN KEY \`FK_49991450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_91231450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_21991450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_494b27cb13b59128fb24b365ca6\``
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
      `DROP INDEX \`REL_439d0b187986492b58178a82c3\` ON \`visual\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_77777ca8ac212b8357637794d6\` ON \`profile\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_3795f9dd15ef3ef2dd1d27e309\` ON \`organization_verification\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_22be0d440df7972d9b3a94aa6d\` ON \`organization_verification\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_49030bc57aa0f319cee7996fca\` ON \`preference\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_8888dccdda9ba57d8e3a634cd8\` ON \`preference_set\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_77994efc5eb5936ed70f2c55903\` ON \`storage_bucket\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_266bc44a18601f893566962df7\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_badc07674ce4e44801e5a5f36c\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_037ba4b170844c039e74aa22ec\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_7671a7e33f6665764f4534a596\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_95bbac07221e98072beafa6173\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_95bbac07221e98072beafa6173\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_58fd47c4a6ac8df9fe2bcaed87\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_88880355b4e9bd6b02c66507aa\` ON \`user\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_7777dccdda9ba57d8e3a634cd0\` ON \`updates\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_7fbe50fa78a37776ad962cb764\` ON \`community\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_c9ff67519d26140f98265a542e\` ON \`community\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_1dc9521a013c92854e92e09933\` ON \`canvas\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_08d1ccc94b008dbda894a3cfa2\` ON \`canvas\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_7777dccdda9ba57d8e3a634cd8\` ON \`room\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_c4fb636888fc391cf1d7406e89\` ON \`aspect\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c4fb636888fc391cf1d7406e89\` ON \`aspect\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_67663901817dd09d5906537e088\` ON \`aspect\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_88888ccdda9ba57d8e3a634cd8\` ON \`whiteboard_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_76542ccdda9ba57d8e3a634cd8\` ON \`innovation_flow_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_66666ccdda9ba57d8e3a634cd8\` ON \`templates_set\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_44447ccdda9ba57d8e3a634cd8\` ON \`post_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_22a2ec1b5bca6c54678ffb19eb\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_22a2ec1b5bca6c54678ffb19eb\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_c506eee0b7d06523b2953d0733\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c506eee0b7d06523b2953d0733\` ON \`callout\``
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
      `DROP INDEX \`IDX_111838434c7198a323ea6f475fb\` ON \`calendar_event\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_94994efc5eb5936ed70f2c55903\` ON \`calendar\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_e6203bc09ec8b93debeb3a44cb9\` ON \`timeline\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_10ed346b16ca044cd84fb1c4034\` ON \`timeline\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_17a161eef37c9f07186532ab75\` ON \`hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6db8627abbf00b1b986e359054\` ON \`hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_f5ad15bcb06a95c2a109fbcce2\` ON \`hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_ec1a68698d32f610a5fc1880c7\` ON \`hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b0c3f360534db92017e36a00bb\` ON \`hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_99990355b4e9bd6b02c66507aa\` ON \`hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_6325f4ef25c4e07e723a96ed37\` ON \`hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_cfe913bad45e399cc0d828ebaf8\` ON \`hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_fa617e79d6b2926edc7b4a3878\` ON \`opportunity\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_88592bee71718eec66a3bfc63f\` ON \`challenge\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_d4551f18fed106ae2e20c70f7c\` ON \`challenge\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP COLUMN \`hubId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` DROP COLUMN \`canvasId\``
    );
    await queryRunner.query(`ALTER TABLE \`hub\` DROP COLUMN \`timelineID\``);
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`parentHubID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD \`hubID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` ADD \`canvasID\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`timelineId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD UNIQUE INDEX \`IDX_59c8a5b7c5e4faff050e8b1ccf\` (\`timelineId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`parentHubId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` DROP FOREIGN KEY \`FK_eb59b98ee6ef26c993d0d75c83c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP FOREIGN KEY \`FK_a96475631aba7dce41db03cc8b2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP FOREIGN KEY \`FK_73e8ae665a49366ca7e2866a45d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` DROP FOREIGN KEY \`FK_b411e4f27d77a96eccdabbf4b45\``
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` DROP FOREIGN KEY \`FK_8ed9d1af584fa62f1ad3405b33b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP FOREIGN KEY \`FK_e8e32f1e59c349b406a4752e545\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_09f909622aa177a097256b7cc22\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP FOREIGN KEY \`FK_56f5614fff0028d403704995822\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_4555dccdda9ba57d8e3a634cd0d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP FOREIGN KEY \`FK_a20c5901817dd09d5906537e087\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_6e7584bfb417bd0f8e8696ab585\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` DROP FOREIGN KEY \`FK_a2afa3851ea733de932251b3a1f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` DROP FOREIGN KEY \`FK_bde98d59e8984e7d17034c3b937\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` DROP FOREIGN KEY \`FK_658580aea4e1a892227e27db902\``
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` DROP FOREIGN KEY \`FK_5f0dbc3b097ef297bd5f4ddb1a9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` DROP FOREIGN KEY \`FK_353b042af56f01ce222f08abf49\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_1dc9521a013c92854e92e099335\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_6289dee12effb51320051c6f1fc\``
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` DROP FOREIGN KEY \`FK_53fccd56207915b969b91834e04\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_262ecf3f5d70b82a48336184251\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP FOREIGN KEY \`FK_fac8673f44e6b295e30d1c1739a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_a344b754f33792cbbc58e41e898\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_178fa41e46fd331f3501a62f6bf\``
    );
    await queryRunner.query(
      `ALTER TABLE \`authorization_policy\` DROP PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`authorization_policy\` DROP COLUMN \`id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`authorization_policy\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`agreement\` DROP FOREIGN KEY \`FK_22348b89c2f802a3d75d52fbd57\``
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` DROP FOREIGN KEY \`FK_81fc213b2d9ad0cddeab1a9ce64\``
    );
    await queryRunner.query(`ALTER TABLE \`tagset\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`tagset\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`tagset\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_eb59b98ee6ef26c993d0d75c83\` ON \`tagset\``
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` ADD UNIQUE INDEX \`IDX_eb59b98ee6ef26c993d0d75c83\` (\`authorizationId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`tagset\` DROP COLUMN \`profileId\``);
    await queryRunner.query(
      `ALTER TABLE \`tagset\` ADD \`profileId\` varchar(36) NULL`
    );
    await queryRunner.query(`ALTER TABLE \`visual\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`visual\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
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
      `ALTER TABLE \`visual\` CHANGE \`alternativeText\` \`alternativeText\` varchar(120) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD UNIQUE INDEX \`IDX_4fbd109f9bb84f58b7a3c60649\` (\`authorizationId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`visual\` DROP COLUMN \`profileId\``);
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD \`profileId\` varchar(36) NULL`
    );
    await queryRunner.query(`ALTER TABLE \`location\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`location\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`location\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
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
      `ALTER TABLE \`reference\` DROP FOREIGN KEY \`FK_2f46c698fc4c19a8cc233c5f255\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` DROP FOREIGN KEY \`FK_36c8905c2c6c59467c60d94fd8a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP FOREIGN KEY \`FK_9912e4cfc1e09848a392a651514\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_9466682df91534dd95e4dbaa616\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_2d8a3ca181c3f0346817685d21d\``
    );
    await queryRunner.query(`ALTER TABLE \`profile\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`profile\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP COLUMN \`displayName\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`displayName\` text NULL`
    );
    await queryRunner.query(`ALTER TABLE \`profile\` DROP COLUMN \`tagline\``);
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`tagline\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` CHANGE \`description\` \`description\` text NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a96475631aba7dce41db03cc8b\` ON \`profile\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD UNIQUE INDEX \`IDX_a96475631aba7dce41db03cc8b\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP COLUMN \`locationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`locationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD UNIQUE INDEX \`IDX_432056041df0e4337b17ff7b09\` (\`locationId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`reference\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`reference\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` CHANGE \`description\` \`description\` text NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_73e8ae665a49366ca7e2866a45\` ON \`reference\``
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD UNIQUE INDEX \`IDX_73e8ae665a49366ca7e2866a45\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD \`profileId\` varchar(36) NULL`
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
      `ALTER TABLE \`innovation_hub\` CHANGE \`hubVisibilityFilter\` \`hubVisibilityFilter\` varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` CHANGE \`hubListFilter\` \`hubListFilter\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` CHANGE \`authorizationId\` \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` CHANGE \`profileId\` \`profileId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`credential\` DROP FOREIGN KEY \`FK_dbe0929355f82e5995f0b7fd5e2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_b61c694cacfab25533bd23d9add\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_c814aa7dc8a68f27d96d5d1782c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_b025a2720e5ee0e5b38774f7a8c\``
    );
    await queryRunner.query(`ALTER TABLE \`agent\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`agent\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`agent\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` CHANGE \`parentDisplayID\` \`parentDisplayID\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` CHANGE \`did\` \`did\` varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` CHANGE \`password\` \`password\` varchar(255) NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_8ed9d1af584fa62f1ad3405b33\` ON \`agent\``
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` ADD UNIQUE INDEX \`IDX_8ed9d1af584fa62f1ad3405b33\` (\`authorizationId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`credential\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`credential\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`credential\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`credential\` DROP COLUMN \`resourceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`credential\` ADD \`resourceID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`credential\` DROP COLUMN \`agentId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`credential\` ADD \`agentId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP FOREIGN KEY \`FK_7ec2857c7d8d16432ffca1cb3d9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` DROP FOREIGN KEY \`FK_bd3c7c6c2dbc2a8daf4b1500a69\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP FOREIGN KEY \`FK_f425931bb61a95ef6f6d89c9a85\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_6860f1e3ae5509245bdb5c401f3\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_3c535130cde781b69259eec7d85\``
    );
    await queryRunner.query(`ALTER TABLE \`lifecycle\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`lifecycle\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`lifecycle\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`lifecycle\` CHANGE \`machineState\` \`machineState\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`lifecycle\` CHANGE \`machineDef\` \`machineDef\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` DROP PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` DROP COLUMN \`id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` DROP COLUMN \`organizationID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` ADD \`organizationID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` ADD UNIQUE INDEX \`IDX_c66eddab0caacb1ef8d46bcafd\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` DROP COLUMN \`lifecycleId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` ADD \`lifecycleId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` ADD UNIQUE INDEX \`IDX_1cc3b275fc2a9d9d9b0ae33b31\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_definition\` DROP PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_definition\` DROP COLUMN \`id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_definition\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(`ALTER TABLE \`preference\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`preference\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD UNIQUE INDEX \`IDX_b4cf0f96bf08cf396f68355522\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` DROP COLUMN \`preferenceDefinitionId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD \`preferenceDefinitionId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` DROP COLUMN \`preferenceSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD \`preferenceSetId\` varchar(36) NULL`
    );
    await queryRunner.query(`ALTER TABLE \`preference_set\` DROP PRIMARY KEY`);
    await queryRunner.query(
      `ALTER TABLE \`preference_set\` DROP COLUMN \`id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_set\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_set\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_set\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_set\` ADD UNIQUE INDEX \`IDX_8e76dcf171c45875c44febb1d8\` (\`authorizationId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`document\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`document\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP COLUMN \`createdBy\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD \`createdBy\` varchar(36) NULL`
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
      `ALTER TABLE \`document\` CHANGE \`anonymousReadAccess\` \`anonymousReadAccess\` tinyint NOT NULL DEFAULT 0`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD UNIQUE INDEX \`IDX_d9e2dfcccf59233c17cc6bc641\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP COLUMN \`storageBucketId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD \`storageBucketId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP COLUMN \`tagsetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD \`tagsetId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD UNIQUE INDEX \`IDX_9fb9257b14ec21daf5bc9aa4c8\` (\`tagsetId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`storage_bucket\` DROP PRIMARY KEY`);
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` DROP COLUMN \`id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` CHANGE \`allowedMimeTypes\` \`allowedMimeTypes\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` CHANGE \`maxFileSize\` \`maxFileSize\` int NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` ADD UNIQUE INDEX \`IDX_f2f48b57269987b13b415a0058\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` DROP COLUMN \`parentStorageBucketId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` ADD \`parentStorageBucketId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` CHANGE \`rowId\` \`rowId\` int NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`organization\` DROP PRIMARY KEY`);
    await queryRunner.query(
      `ALTER TABLE \`organization\` CHANGE \`rowId\` \`rowId\` int NOT NULL AUTO_INCREMENT`
    );
    await queryRunner.query(`ALTER TABLE \`organization\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP COLUMN \`nameID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD \`nameID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD UNIQUE INDEX \`IDX_9fdd8f0bfe04a676822c7265e1\` (\`rowId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD UNIQUE INDEX \`IDX_e0e150e4f11d906b931b46a2d8\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD \`profileId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD UNIQUE INDEX \`IDX_d2cb77c14644156ec8e865608e\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP COLUMN \`agentId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD \`agentId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD UNIQUE INDEX \`IDX_7f1bec8979b57ed7ebd392a2ca\` (\`agentId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP COLUMN \`verificationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD \`verificationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD UNIQUE INDEX \`IDX_5a72d5b37312bac2e0a0115718\` (\`verificationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP COLUMN \`preferenceSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD \`preferenceSetId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD UNIQUE INDEX \`IDX_58fd47c4a6ac8df9fe2bcaed87\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP COLUMN \`storageBucketId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD \`storageBucketId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD UNIQUE INDEX \`IDX_0bf5e52d71b2665f216b06433c\` (\`storageBucketId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP FOREIGN KEY \`FK_9fcc131f256e969d773327f07cb\``
    );
    await queryRunner.query(`ALTER TABLE \`user_group\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`user_group\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(`ALTER TABLE \`user_group\` DROP COLUMN \`hubID\``);
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD \`hubID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_e8e32f1e59c349b406a4752e54\` ON \`user_group\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD UNIQUE INDEX \`IDX_e8e32f1e59c349b406a4752e54\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_9912e4cfc1e09848a392a65151\` ON \`user_group\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD \`profileId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD UNIQUE INDEX \`IDX_9912e4cfc1e09848a392a65151\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP COLUMN \`organizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD \`organizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP COLUMN \`communityId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD \`communityId\` varchar(36) NULL`
    );
    await queryRunner.query(`ALTER TABLE \`nvp\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`nvp\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`nvp\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(`ALTER TABLE \`nvp\` DROP COLUMN \`value\``);
    await queryRunner.query(
      `ALTER TABLE \`nvp\` ADD \`value\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP FOREIGN KEY \`FK_b4ae3fea4a24b4be1a86dacf8a2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` CHANGE \`rowId\` \`rowId\` int NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`user\` DROP PRIMARY KEY`);
    await queryRunner.query(
      `ALTER TABLE \`user\` CHANGE \`rowId\` \`rowId\` int NOT NULL AUTO_INCREMENT`
    );
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`nameID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_09f909622aa177a097256b7cc2\` ON \`user\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_09f909622aa177a097256b7cc2\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_9466682df91534dd95e4dbaa61\` ON \`user\``
    );
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`profileId\``);
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`profileId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_9466682df91534dd95e4dbaa61\` (\`profileId\`)`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b61c694cacfab25533bd23d9ad\` ON \`user\``
    );
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`agentId\``);
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`agentId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_b61c694cacfab25533bd23d9ad\` (\`agentId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP COLUMN \`preferenceSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`preferenceSetId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_028322b763dc94242dc9f638f9\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP FOREIGN KEY \`FK_500cee6f635849f50e19c7e2b76\``
    );
    await queryRunner.query(`ALTER TABLE \`application\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`application\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_56f5614fff0028d40370499582\` ON \`application\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD UNIQUE INDEX \`IDX_56f5614fff0028d40370499582\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_7ec2857c7d8d16432ffca1cb3d\` ON \`application\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP COLUMN \`lifecycleId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD \`lifecycleId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD UNIQUE INDEX \`IDX_7ec2857c7d8d16432ffca1cb3d\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP COLUMN \`userId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD \`userId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP COLUMN \`communityId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD \`communityId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_c6a084fe80d01c41d9f142d51aa\``
    );
    await queryRunner.query(`ALTER TABLE \`discussion\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`discussion\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP COLUMN \`nameID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD \`nameID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` CHANGE \`createdBy\` \`createdBy\` char(36) NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_4555dccdda9ba57d8e3a634cd0\` ON \`discussion\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD UNIQUE INDEX \`IDX_4555dccdda9ba57d8e3a634cd0\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD \`profileId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD UNIQUE INDEX \`IDX_2d8a3ca181c3f0346817685d21\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP COLUMN \`communicationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD \`communicationId\` varchar(36) NULL`
    );
    await queryRunner.query(`ALTER TABLE \`updates\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`updates\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`updates\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`updates\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`updates\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`updates\` ADD UNIQUE INDEX \`IDX_c69da93b39aa0a8c5cacd60a5e\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_7fbe50fa78a37776ad962cb7643\``
    );
    await queryRunner.query(`ALTER TABLE \`communication\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`communication\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP COLUMN \`hubID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD \`hubID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` CHANGE \`discussionCategories\` \`discussionCategories\` text NOT NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a20c5901817dd09d5906537e08\` ON \`communication\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD UNIQUE INDEX \`IDX_a20c5901817dd09d5906537e08\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP COLUMN \`updatesId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD \`updatesId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD UNIQUE INDEX \`IDX_eb99e588873c788a68a035478a\` (\`updatesId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_policy\` DROP PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_policy\` DROP COLUMN \`id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community_policy\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_policy\` CHANGE \`member\` \`member\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_policy\` CHANGE \`lead\` \`lead\` text NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`form\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`form\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`form\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`form\` CHANGE \`questions\` \`questions\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`form\` CHANGE \`description\` \`description\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_8e8283bdacc9e770918fe689333\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_1c7744df92f39ab567084fd8c09\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_aa9668dd2340c2d794b414577b6\``
    );
    await queryRunner.query(`ALTER TABLE \`community\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`community\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(`ALTER TABLE \`community\` DROP COLUMN \`hubID\``);
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`hubID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6e7584bfb417bd0f8e8696ab58\` ON \`community\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD UNIQUE INDEX \`IDX_6e7584bfb417bd0f8e8696ab58\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`communicationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`communicationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD UNIQUE INDEX \`IDX_7fbe50fa78a37776ad962cb764\` (\`communicationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`applicationFormId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`applicationFormId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD UNIQUE INDEX \`IDX_c7d74dd6b92d4202c705cd3676\` (\`applicationFormId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`policyId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`policyId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD UNIQUE INDEX \`IDX_3823de95920943655430125fa9\` (\`policyId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`parentCommunityId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`parentCommunityId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` DROP FOREIGN KEY \`FK_0f9d41ee193d631a5439bb4f404\``
    );
    await queryRunner.query(`ALTER TABLE \`actor\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`actor\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`actor\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` CHANGE \`description\` \`description\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` CHANGE \`value\` \`value\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` CHANGE \`impact\` \`impact\` varchar(255) NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a2afa3851ea733de932251b3a1\` ON \`actor\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` ADD UNIQUE INDEX \`IDX_a2afa3851ea733de932251b3a1\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` DROP COLUMN \`actorGroupId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` ADD \`actorGroupId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` DROP FOREIGN KEY \`FK_cbb1d7afa052a184471723d3297\``
    );
    await queryRunner.query(`ALTER TABLE \`actor_group\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`actor_group\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` CHANGE \`description\` \`description\` text NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_bde98d59e8984e7d17034c3b93\` ON \`actor_group\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` ADD UNIQUE INDEX \`IDX_bde98d59e8984e7d17034c3b93\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` DROP COLUMN \`ecosystemModelId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` ADD \`ecosystemModelId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` DROP FOREIGN KEY \`FK_a03169c3f86480ba3863924f4d7\``
    );
    await queryRunner.query(`ALTER TABLE \`ecosystem_model\` DROP PRIMARY KEY`);
    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` DROP COLUMN \`id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` CHANGE \`description\` \`description\` varchar(255) NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_658580aea4e1a892227e27db90\` ON \`ecosystem_model\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` ADD UNIQUE INDEX \`IDX_658580aea4e1a892227e27db90\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_9c169eb500e2d3823154c7b603d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_1deebaabfc620e881858333b0d0\``
    );
    await queryRunner.query(`ALTER TABLE \`context\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`context\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` CHANGE \`vision\` \`vision\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` CHANGE \`impact\` \`impact\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` CHANGE \`who\` \`who\` text NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_5f0dbc3b097ef297bd5f4ddb1a\` ON \`context\``
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD UNIQUE INDEX \`IDX_5f0dbc3b097ef297bd5f4ddb1a\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a03169c3f86480ba3863924f4d\` ON \`context\``
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` DROP COLUMN \`ecosystemModelId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD \`ecosystemModelId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD UNIQUE INDEX \`IDX_a03169c3f86480ba3863924f4d\` (\`ecosystemModelId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_08d1ccc94b008dbda894a3cfa20\``
    );
    await queryRunner.query(`ALTER TABLE \`canvas_checkout\` DROP PRIMARY KEY`);
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` DROP COLUMN \`id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_353b042af56f01ce222f08abf4\` ON \`canvas_checkout\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` ADD UNIQUE INDEX \`IDX_353b042af56f01ce222f08abf4\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_bd3c7c6c2dbc2a8daf4b1500a6\` ON \`canvas_checkout\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` DROP COLUMN \`lifecycleId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` ADD \`lifecycleId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` ADD UNIQUE INDEX \`IDX_bd3c7c6c2dbc2a8daf4b1500a6\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_fcabc1f3aa38aca70df4f66e938\``
    );
    await queryRunner.query(`ALTER TABLE \`canvas\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`canvas\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(`ALTER TABLE \`canvas\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`nameID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` CHANGE \`createdBy\` \`createdBy\` char(36) NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_1dc9521a013c92854e92e09933\` ON \`canvas\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD UNIQUE INDEX \`IDX_1dc9521a013c92854e92e09933\` (\`authorizationId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`canvas\` DROP COLUMN \`profileId\``);
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`profileId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD UNIQUE INDEX \`IDX_50a7f6aa62426a0d3a9fb98b92\` (\`profileId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`canvas\` DROP COLUMN \`calloutId\``);
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`calloutId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_08d1ccc94b008dbda894a3cfa2\` ON \`canvas\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP COLUMN \`checkoutId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`checkoutId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD UNIQUE INDEX \`IDX_08d1ccc94b008dbda894a3cfa2\` (\`checkoutId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_62ed316cda7b75735b20307b47e\``
    );
    await queryRunner.query(`ALTER TABLE \`room\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`room\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`room\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(`ALTER TABLE \`room\` DROP COLUMN \`type\``);
    await queryRunner.query(`ALTER TABLE \`room\` ADD \`type\` text NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE \`room\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` ADD UNIQUE INDEX \`IDX_d1d94dd8e0c417b4188a05ccbc\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_deceb07e75a8600e38d5de14a89\``
    );
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`nameID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`type\``);
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`type\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` CHANGE \`createdBy\` \`createdBy\` char(36) NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c52470717008d58ec6d76b12ff\` ON \`aspect\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD UNIQUE INDEX \`IDX_c52470717008d58ec6d76b12ff\` (\`authorizationId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`profileId\``);
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`profileId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD UNIQUE INDEX \`IDX_766f8d8f48a8cd59f7fa919d16\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP COLUMN \`commentsId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`commentsId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD UNIQUE INDEX \`IDX_9929313cdeadf891732eedac29\` (\`commentsId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`calloutId\``);
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`calloutId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` DROP PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` DROP COLUMN \`id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD UNIQUE INDEX \`IDX_cc2faf30ce52648db9299d7072\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD \`profileId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD UNIQUE INDEX \`IDX_5b4948db27c348e65055187d5e\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` DROP COLUMN \`templatesSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD \`templatesSetId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP COLUMN \`id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP COLUMN \`type\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD \`type\` varchar(255) NOT NULL DEFAULT 'challenge'`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD UNIQUE INDEX \`IDX_3aec561629db1d65a9b2b3a788\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD \`profileId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD UNIQUE INDEX \`IDX_bd591d7403dabe091f6a116975\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP COLUMN \`templatesSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD \`templatesSetId\` varchar(36) NULL`
    );
    await queryRunner.query(`ALTER TABLE \`templates_set\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`templates_set\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` CHANGE \`policy\` \`policy\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` ADD UNIQUE INDEX \`IDX_eb0176ef4b98c143322aa6f809\` (\`authorizationId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`post_template\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`post_template\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD UNIQUE INDEX \`IDX_c3bdb693adb031b6613edcef4f\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD \`profileId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD UNIQUE INDEX \`IDX_4a9c8cefc6c7e33aa728d22a90\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` DROP COLUMN \`templatesSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD \`templatesSetId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_9b1c5ee044611ac78249194ec35\``
    );
    await queryRunner.query(`ALTER TABLE \`callout\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`callout\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(`ALTER TABLE \`callout\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`nameID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` CHANGE \`createdBy\` \`createdBy\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` CHANGE \`group\` \`group\` varchar(32) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` CHANGE \`sortOrder\` \`sortOrder\` int NOT NULL DEFAULT '10'`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` CHANGE \`publishedBy\` \`publishedBy\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` CHANGE \`publishedDate\` \`publishedDate\` datetime NOT NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6289dee12effb51320051c6f1f\` ON \`callout\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD UNIQUE INDEX \`IDX_6289dee12effb51320051c6f1f\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`profileId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD UNIQUE INDEX \`IDX_616740222f408bbf5f5fcdecd6\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`postTemplateId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`postTemplateId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD UNIQUE INDEX \`IDX_0527bc6a59e81ecc579c28600e\` (\`postTemplateId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`whiteboardTemplateId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`whiteboardTemplateId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD UNIQUE INDEX \`IDX_e1854ef3b023aaf8f417c99fa4\` (\`whiteboardTemplateId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`commentsId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`commentsId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD UNIQUE INDEX \`IDX_62ed316cda7b75735b20307b47\` (\`commentsId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`collaborationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`collaborationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` DROP FOREIGN KEY \`FK_701a6f8e3e1da76354571767c3f\``
    );
    await queryRunner.query(`ALTER TABLE \`relation\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`relation\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`relation\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` CHANGE \`description\` \`description\` text NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_53fccd56207915b969b91834e0\` ON \`relation\``
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` ADD UNIQUE INDEX \`IDX_53fccd56207915b969b91834e0\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` DROP COLUMN \`collaborationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` ADD \`collaborationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_6325f4ef25c4e07e723a96ed37c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_fa617e79d6b2926edc7b4a3878f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_d4551f18fed106ae2e20c70f7cb\``
    );
    await queryRunner.query(`ALTER TABLE \`collaboration\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`collaboration\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_262ecf3f5d70b82a4833618425\` ON \`collaboration\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD UNIQUE INDEX \`IDX_262ecf3f5d70b82a4833618425\` (\`authorizationId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`calendar_event\` DROP PRIMARY KEY`);
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP COLUMN \`id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
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
      `ALTER TABLE \`calendar_event\` DROP COLUMN \`createdBy\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD \`createdBy\` varchar(36) NULL`
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
      `ALTER TABLE \`calendar_event\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD UNIQUE INDEX \`IDX_8ee86afa2808a4ab523b9ee6c5\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD \`profileId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD UNIQUE INDEX \`IDX_9349e137959f3ca5818c2e62b3\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP COLUMN \`commentsId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD \`commentsId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD UNIQUE INDEX \`IDX_b5069b11030e9608ee4468f850\` (\`commentsId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP COLUMN \`calendarId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD \`calendarId\` varchar(36) NULL`
    );
    await queryRunner.query(`ALTER TABLE \`calendar\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`calendar\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`calendar\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar\` ADD UNIQUE INDEX \`IDX_6e74d59afda096b68d12a69969\` (\`authorizationId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`timeline\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`timeline\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`timeline\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` ADD UNIQUE INDEX \`IDX_5fe58ece01b48496aebc04733d\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` DROP COLUMN \`calendarId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` ADD \`calendarId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` ADD UNIQUE INDEX \`IDX_56aae15a664b2889a1a11c2cf8\` (\`calendarId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`hub\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`hub\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(`ALTER TABLE \`hub\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`nameID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` CHANGE \`visibility\` \`visibility\` varchar(255) NOT NULL DEFAULT 'active'`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD UNIQUE INDEX \`IDX_d74624956206f278a391b58623\` (\`authorizationId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`hub\` DROP COLUMN \`profileId\``);
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`profileId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD UNIQUE INDEX \`IDX_7642bbebcf21b02809de36624a\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP COLUMN \`collaborationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`collaborationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD UNIQUE INDEX \`IDX_6325f4ef25c4e07e723a96ed37\` (\`collaborationId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`hub\` DROP COLUMN \`contextId\``);
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`contextId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD UNIQUE INDEX \`IDX_ea92594bb43e50c9c1be21da8c\` (\`contextId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`hub\` DROP COLUMN \`communityId\``);
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`communityId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD UNIQUE INDEX \`IDX_3da8c600d1a01e741cc47d23d7\` (\`communityId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`hub\` DROP COLUMN \`lifecycleId\``);
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`lifecycleId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD UNIQUE INDEX \`IDX_e3c654c355c81dcdbe7492b2a7\` (\`lifecycleId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`hub\` DROP COLUMN \`agentId\``);
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`agentId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD UNIQUE INDEX \`IDX_0ba883dcddf3e7f55a0db3c8ca\` (\`agentId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP COLUMN \`preferenceSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`preferenceSetId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD UNIQUE INDEX \`IDX_cb7bffcb96f77f1cbd4fe7415d\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP COLUMN \`templatesSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`templatesSetId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD UNIQUE INDEX \`IDX_97f76b96209eabf9ecc42b0f53\` (\`templatesSetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP COLUMN \`storageBucketId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`storageBucketId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD UNIQUE INDEX \`IDX_24485ae3ec713db56648ef8ef9\` (\`storageBucketId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`agreement\` DROP FOREIGN KEY \`FK_8785b5a8510cabcc25d0f196783\``
    );
    await queryRunner.query(`ALTER TABLE \`agreement\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`agreement\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`agreement\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`agreement\` CHANGE \`description\` \`description\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`agreement\` DROP COLUMN \`projectId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`agreement\` ADD \`projectId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_22348b89c2f802a3d75d52fbd5\` ON \`agreement\``
    );
    await queryRunner.query(
      `ALTER TABLE \`agreement\` DROP COLUMN \`tagsetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`agreement\` ADD \`tagsetId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`agreement\` ADD UNIQUE INDEX \`IDX_22348b89c2f802a3d75d52fbd5\` (\`tagsetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP FOREIGN KEY \`FK_35e34564793a27bb3c209a15245\``
    );
    await queryRunner.query(`ALTER TABLE \`project\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`project\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(`ALTER TABLE \`project\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD \`nameID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`project\` DROP COLUMN \`hubID\``);
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD \`hubID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_fac8673f44e6b295e30d1c1739\` ON \`project\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD UNIQUE INDEX \`IDX_fac8673f44e6b295e30d1c1739\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD \`profileId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD UNIQUE INDEX \`IDX_6814b5d57d931283b1a2a1908c\` (\`profileId\`)`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_f425931bb61a95ef6f6d89c9a8\` ON \`project\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP COLUMN \`lifecycleId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD \`lifecycleId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD UNIQUE INDEX \`IDX_f425931bb61a95ef6f6d89c9a8\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP COLUMN \`opportunityId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD \`opportunityId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_0e2c355dbb2950851dbc17a4490\``
    );
    await queryRunner.query(`ALTER TABLE \`opportunity\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`opportunity\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`nameID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`nameID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`hubID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`hubID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a344b754f33792cbbc58e41e89\` ON \`opportunity\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD UNIQUE INDEX \`IDX_a344b754f33792cbbc58e41e89\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`profileId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD UNIQUE INDEX \`IDX_28129cec24e65cc8340ecd1284\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`collaborationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`collaborationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD UNIQUE INDEX \`IDX_fa617e79d6b2926edc7b4a3878\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_9c169eb500e2d3823154c7b603\` ON \`opportunity\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`contextId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`contextId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD UNIQUE INDEX \`IDX_9c169eb500e2d3823154c7b603\` (\`contextId\`)`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_1c7744df92f39ab567084fd8c0\` ON \`opportunity\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`communityId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`communityId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD UNIQUE INDEX \`IDX_1c7744df92f39ab567084fd8c0\` (\`communityId\`)`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6860f1e3ae5509245bdb5c401f\` ON \`opportunity\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`lifecycleId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`lifecycleId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD UNIQUE INDEX \`IDX_6860f1e3ae5509245bdb5c401f\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c814aa7dc8a68f27d96d5d1782\` ON \`opportunity\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`agentId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`agentId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD UNIQUE INDEX \`IDX_c814aa7dc8a68f27d96d5d1782\` (\`agentId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`challengeId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`challengeId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_7d2b222d54b900071b0959f03ef\``
    );
    await queryRunner.query(`ALTER TABLE \`challenge\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`challenge\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`
    );
    await queryRunner.query(`ALTER TABLE \`challenge\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`nameID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`challenge\` DROP COLUMN \`hubID\``);
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`hubID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_178fa41e46fd331f3501a62f6b\` ON \`challenge\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD UNIQUE INDEX \`IDX_178fa41e46fd331f3501a62f6b\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`profileId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD UNIQUE INDEX \`IDX_eedbe52ec6041ac337528d3dd0\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`collaborationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`collaborationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD UNIQUE INDEX \`IDX_d4551f18fed106ae2e20c70f7c\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_1deebaabfc620e881858333b0d\` ON \`challenge\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`contextId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`contextId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD UNIQUE INDEX \`IDX_1deebaabfc620e881858333b0d\` (\`contextId\`)`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_aa9668dd2340c2d794b414577b\` ON \`challenge\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`communityId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`communityId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD UNIQUE INDEX \`IDX_aa9668dd2340c2d794b414577b\` (\`communityId\`)`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_3c535130cde781b69259eec7d8\` ON \`challenge\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`lifecycleId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`lifecycleId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD UNIQUE INDEX \`IDX_3c535130cde781b69259eec7d8\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b025a2720e5ee0e5b38774f7a8\` ON \`challenge\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`agentId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`agentId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD UNIQUE INDEX \`IDX_b025a2720e5ee0e5b38774f7a8\` (\`agentId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`parentChallengeId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`parentChallengeId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`preferenceSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`preferenceSetId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD UNIQUE INDEX \`IDX_88592bee71718eec66a3bfc63f\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`storageBucketId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`storageBucketId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD UNIQUE INDEX \`IDX_18c7e16ae2a8cd33a690045566\` (\`storageBucketId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` DROP PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` ADD PRIMARY KEY (\`nvpId\`)`
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_8495fae86f13836b0745642baa\` ON \`application_questions\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` DROP COLUMN \`applicationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` ADD \`applicationId\` varchar(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` DROP PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` ADD PRIMARY KEY (\`nvpId\`, \`applicationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` DROP PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` ADD PRIMARY KEY (\`applicationId\`)`
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_fe50118fd82e7fe2f74f986a19\` ON \`application_questions\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` DROP COLUMN \`nvpId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` ADD \`nvpId\` varchar(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` DROP PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` ADD PRIMARY KEY (\`applicationId\`, \`nvpId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_eb59b98ee6ef26c993d0d75c83\` ON \`tagset\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_4fbd109f9bb84f58b7a3c60649\` ON \`visual\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a96475631aba7dce41db03cc8b\` ON \`profile\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_432056041df0e4337b17ff7b09\` ON \`profile\` (\`locationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_73e8ae665a49366ca7e2866a45\` ON \`reference\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_8ed9d1af584fa62f1ad3405b33\` ON \`agent\` (\`authorizationId\`)`
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
      `CREATE UNIQUE INDEX \`REL_d9e2dfcccf59233c17cc6bc641\` ON \`document\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_9fb9257b14ec21daf5bc9aa4c8\` ON \`document\` (\`tagsetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_f2f48b57269987b13b415a0058\` ON \`storage_bucket\` (\`authorizationId\`)`
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
      `CREATE UNIQUE INDEX \`REL_0bf5e52d71b2665f216b06433c\` ON \`organization\` (\`storageBucketId\`)`
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
      `CREATE UNIQUE INDEX \`REL_56f5614fff0028d40370499582\` ON \`application\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_7ec2857c7d8d16432ffca1cb3d\` ON \`application\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_4555dccdda9ba57d8e3a634cd0\` ON \`discussion\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_2d8a3ca181c3f0346817685d21\` ON \`discussion\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c69da93b39aa0a8c5cacd60a5e\` ON \`updates\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a20c5901817dd09d5906537e08\` ON \`communication\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_eb99e588873c788a68a035478a\` ON \`communication\` (\`updatesId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_6e7584bfb417bd0f8e8696ab58\` ON \`community\` (\`authorizationId\`)`
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
      `CREATE UNIQUE INDEX \`REL_353b042af56f01ce222f08abf4\` ON \`canvas_checkout\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_bd3c7c6c2dbc2a8daf4b1500a6\` ON \`canvas_checkout\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_1dc9521a013c92854e92e09933\` ON \`canvas\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_50a7f6aa62426a0d3a9fb98b92\` ON \`canvas\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_08d1ccc94b008dbda894a3cfa2\` ON \`canvas\` (\`checkoutId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_d1d94dd8e0c417b4188a05ccbc\` ON \`room\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c52470717008d58ec6d76b12ff\` ON \`aspect\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_766f8d8f48a8cd59f7fa919d16\` ON \`aspect\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_9929313cdeadf891732eedac29\` ON \`aspect\` (\`commentsId\`)`
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
      `CREATE UNIQUE INDEX \`REL_eb0176ef4b98c143322aa6f809\` ON \`templates_set\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c3bdb693adb031b6613edcef4f\` ON \`post_template\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_4a9c8cefc6c7e33aa728d22a90\` ON \`post_template\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_6289dee12effb51320051c6f1f\` ON \`callout\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_616740222f408bbf5f5fcdecd6\` ON \`callout\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_0527bc6a59e81ecc579c28600e\` ON \`callout\` (\`postTemplateId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_e1854ef3b023aaf8f417c99fa4\` ON \`callout\` (\`whiteboardTemplateId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_62ed316cda7b75735b20307b47\` ON \`callout\` (\`commentsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_53fccd56207915b969b91834e0\` ON \`relation\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_262ecf3f5d70b82a4833618425\` ON \`collaboration\` (\`authorizationId\`)`
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
      `CREATE UNIQUE INDEX \`REL_d74624956206f278a391b58623\` ON \`hub\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_7642bbebcf21b02809de36624a\` ON \`hub\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_6325f4ef25c4e07e723a96ed37\` ON \`hub\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_ea92594bb43e50c9c1be21da8c\` ON \`hub\` (\`contextId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_3da8c600d1a01e741cc47d23d7\` ON \`hub\` (\`communityId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_e3c654c355c81dcdbe7492b2a7\` ON \`hub\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_0ba883dcddf3e7f55a0db3c8ca\` ON \`hub\` (\`agentId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_cb7bffcb96f77f1cbd4fe7415d\` ON \`hub\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_97f76b96209eabf9ecc42b0f53\` ON \`hub\` (\`templatesSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_59c8a5b7c5e4faff050e8b1ccf\` ON \`hub\` (\`timelineId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_24485ae3ec713db56648ef8ef9\` ON \`hub\` (\`storageBucketId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_22348b89c2f802a3d75d52fbd5\` ON \`agreement\` (\`tagsetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_fac8673f44e6b295e30d1c1739\` ON \`project\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_6814b5d57d931283b1a2a1908c\` ON \`project\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_f425931bb61a95ef6f6d89c9a8\` ON \`project\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a344b754f33792cbbc58e41e89\` ON \`opportunity\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_28129cec24e65cc8340ecd1284\` ON \`opportunity\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_fa617e79d6b2926edc7b4a3878\` ON \`opportunity\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_9c169eb500e2d3823154c7b603\` ON \`opportunity\` (\`contextId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_1c7744df92f39ab567084fd8c0\` ON \`opportunity\` (\`communityId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_6860f1e3ae5509245bdb5c401f\` ON \`opportunity\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c814aa7dc8a68f27d96d5d1782\` ON \`opportunity\` (\`agentId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_178fa41e46fd331f3501a62f6b\` ON \`challenge\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_eedbe52ec6041ac337528d3dd0\` ON \`challenge\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_d4551f18fed106ae2e20c70f7c\` ON \`challenge\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_1deebaabfc620e881858333b0d\` ON \`challenge\` (\`contextId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_aa9668dd2340c2d794b414577b\` ON \`challenge\` (\`communityId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_3c535130cde781b69259eec7d8\` ON \`challenge\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_b025a2720e5ee0e5b38774f7a8\` ON \`challenge\` (\`agentId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_88592bee71718eec66a3bfc63f\` ON \`challenge\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_18c7e16ae2a8cd33a690045566\` ON \`challenge\` (\`storageBucketId\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_8495fae86f13836b0745642baa\` ON \`application_questions\` (\`applicationId\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_fe50118fd82e7fe2f74f986a19\` ON \`application_questions\` (\`nvpId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` ADD CONSTRAINT \`FK_eb59b98ee6ef26c993d0d75c83c\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` ADD CONSTRAINT \`FK_81fc213b2d9ad0cddeab1a9ce64\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD CONSTRAINT \`FK_4fbd109f9bb84f58b7a3c60649c\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD CONSTRAINT \`FK_1104f3ef8497ca40d99b9f46b87\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_a96475631aba7dce41db03cc8b2\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_432056041df0e4337b17ff7b09d\` FOREIGN KEY (\`locationId\`) REFERENCES \`location\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD CONSTRAINT \`FK_73e8ae665a49366ca7e2866a45d\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD CONSTRAINT \`FK_2f46c698fc4c19a8cc233c5f255\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD CONSTRAINT \`FK_b411e4f27d77a96eccdabbf4b45\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD CONSTRAINT \`FK_36c8905c2c6c59467c60d94fd8a\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` ADD CONSTRAINT \`FK_8ed9d1af584fa62f1ad3405b33b\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`credential\` ADD CONSTRAINT \`FK_dbe0929355f82e5995f0b7fd5e2\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
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
      `ALTER TABLE \`storage_bucket\` ADD CONSTRAINT \`FK_157c3de98a49f752d8385fe4d96\` FOREIGN KEY (\`parentStorageBucketId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_0bf5e52d71b2665f216b06433c1\` FOREIGN KEY (\`storageBucketId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_4555dccdda9ba57d8e3a634cd0d\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_2d8a3ca181c3f0346817685d21d\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_c6a084fe80d01c41d9f142d51aa\` FOREIGN KEY (\`communicationId\`) REFERENCES \`communication\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`updates\` ADD CONSTRAINT \`FK_c69da93b39aa0a8c5cacd60a5e0\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD CONSTRAINT \`FK_a20c5901817dd09d5906537e087\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD CONSTRAINT \`FK_eb99e588873c788a68a035478ab\` FOREIGN KEY (\`updatesId\`) REFERENCES \`updates\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_6e7584bfb417bd0f8e8696ab585\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
      `ALTER TABLE \`canvas_checkout\` ADD CONSTRAINT \`FK_353b042af56f01ce222f08abf49\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` ADD CONSTRAINT \`FK_bd3c7c6c2dbc2a8daf4b1500a69\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_1dc9521a013c92854e92e099335\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_50a7f6aa62426a0d3a9fb98b927\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_fcabc1f3aa38aca70df4f66e938\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_08d1ccc94b008dbda894a3cfa20\` FOREIGN KEY (\`checkoutId\`) REFERENCES \`canvas_checkout\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` ADD CONSTRAINT \`FK_d1d94dd8e0c417b4188a05ccbca\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_c52470717008d58ec6d76b12ffa\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_766f8d8f48a8cd59f7fa919d162\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_9929313cdeadf891732eedac290\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_deceb07e75a8600e38d5de14a89\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
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
      `ALTER TABLE \`templates_set\` ADD CONSTRAINT \`FK_eb0176ef4b98c143322aa6f8090\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_6289dee12effb51320051c6f1fc\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_616740222f408bbf5f5fcdecd66\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_0527bc6a59e81ecc579c28600e7\` FOREIGN KEY (\`postTemplateId\`) REFERENCES \`post_template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_e1854ef3b023aaf8f417c99fa4a\` FOREIGN KEY (\`whiteboardTemplateId\`) REFERENCES \`whiteboard_template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_62ed316cda7b75735b20307b47e\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_9b1c5ee044611ac78249194ec35\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` ADD CONSTRAINT \`FK_53fccd56207915b969b91834e04\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` ADD CONSTRAINT \`FK_701a6f8e3e1da76354571767c3f\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_262ecf3f5d70b82a48336184251\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_d74624956206f278a391b586232\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_7642bbebcf21b02809de36624a6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_6325f4ef25c4e07e723a96ed37c\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_ea92594bb43e50c9c1be21da8ce\` FOREIGN KEY (\`contextId\`) REFERENCES \`context\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_3da8c600d1a01e741cc47d23d7d\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_e3c654c355c81dcdbe7492b2a7c\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_0ba883dcddf3e7f55a0db3c8ca4\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_cb7bffcb96f77f1cbd4fe7415d3\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_97f76b96209eabf9ecc42b0f53f\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_59c8a5b7c5e4faff050e8b1ccfd\` FOREIGN KEY (\`timelineId\`) REFERENCES \`timeline\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_24485ae3ec713db56648ef8ef9b\` FOREIGN KEY (\`storageBucketId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`agreement\` ADD CONSTRAINT \`FK_8785b5a8510cabcc25d0f196783\` FOREIGN KEY (\`projectId\`) REFERENCES \`project\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`agreement\` ADD CONSTRAINT \`FK_22348b89c2f802a3d75d52fbd57\` FOREIGN KEY (\`tagsetId\`) REFERENCES \`tagset\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD CONSTRAINT \`FK_fac8673f44e6b295e30d1c1739a\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD CONSTRAINT \`FK_6814b5d57d931283b1a2a1908c9\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD CONSTRAINT \`FK_f425931bb61a95ef6f6d89c9a85\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD CONSTRAINT \`FK_35e34564793a27bb3c209a15245\` FOREIGN KEY (\`opportunityId\`) REFERENCES \`opportunity\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_a344b754f33792cbbc58e41e898\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_28129cec24e65cc8340ecd12844\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_fa617e79d6b2926edc7b4a3878f\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_9c169eb500e2d3823154c7b603d\` FOREIGN KEY (\`contextId\`) REFERENCES \`context\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_1c7744df92f39ab567084fd8c09\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_6860f1e3ae5509245bdb5c401f3\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_c814aa7dc8a68f27d96d5d1782c\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_0e2c355dbb2950851dbc17a4490\` FOREIGN KEY (\`challengeId\`) REFERENCES \`challenge\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_178fa41e46fd331f3501a62f6bf\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_eedbe52ec6041ac337528d3dd02\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_d4551f18fed106ae2e20c70f7cb\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_1deebaabfc620e881858333b0d0\` FOREIGN KEY (\`contextId\`) REFERENCES \`context\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_aa9668dd2340c2d794b414577b6\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_3c535130cde781b69259eec7d85\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_b025a2720e5ee0e5b38774f7a8c\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_7d2b222d54b900071b0959f03ef\` FOREIGN KEY (\`parentChallengeId\`) REFERENCES \`challenge\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_d7e94a4658f1816e60798542296\` FOREIGN KEY (\`parentHubId\`) REFERENCES \`hub\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_88592bee71718eec66a3bfc63fd\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_18c7e16ae2a8cd33a690045566a\` FOREIGN KEY (\`storageBucketId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_18c7e16ae2a8cd33a690045566a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_88592bee71718eec66a3bfc63fd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_d7e94a4658f1816e60798542296\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_7d2b222d54b900071b0959f03ef\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_b025a2720e5ee0e5b38774f7a8c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_3c535130cde781b69259eec7d85\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_aa9668dd2340c2d794b414577b6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_1deebaabfc620e881858333b0d0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_d4551f18fed106ae2e20c70f7cb\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_eedbe52ec6041ac337528d3dd02\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_178fa41e46fd331f3501a62f6bf\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_0e2c355dbb2950851dbc17a4490\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_c814aa7dc8a68f27d96d5d1782c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_6860f1e3ae5509245bdb5c401f3\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_1c7744df92f39ab567084fd8c09\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_9c169eb500e2d3823154c7b603d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_fa617e79d6b2926edc7b4a3878f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_28129cec24e65cc8340ecd12844\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_a344b754f33792cbbc58e41e898\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP FOREIGN KEY \`FK_35e34564793a27bb3c209a15245\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP FOREIGN KEY \`FK_f425931bb61a95ef6f6d89c9a85\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP FOREIGN KEY \`FK_6814b5d57d931283b1a2a1908c9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP FOREIGN KEY \`FK_fac8673f44e6b295e30d1c1739a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`agreement\` DROP FOREIGN KEY \`FK_22348b89c2f802a3d75d52fbd57\``
    );
    await queryRunner.query(
      `ALTER TABLE \`agreement\` DROP FOREIGN KEY \`FK_8785b5a8510cabcc25d0f196783\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_24485ae3ec713db56648ef8ef9b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_59c8a5b7c5e4faff050e8b1ccfd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_97f76b96209eabf9ecc42b0f53f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_cb7bffcb96f77f1cbd4fe7415d3\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_0ba883dcddf3e7f55a0db3c8ca4\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_e3c654c355c81dcdbe7492b2a7c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_3da8c600d1a01e741cc47d23d7d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_ea92594bb43e50c9c1be21da8ce\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_6325f4ef25c4e07e723a96ed37c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_7642bbebcf21b02809de36624a6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_d74624956206f278a391b586232\``
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
      `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_262ecf3f5d70b82a48336184251\``
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` DROP FOREIGN KEY \`FK_701a6f8e3e1da76354571767c3f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` DROP FOREIGN KEY \`FK_53fccd56207915b969b91834e04\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_9b1c5ee044611ac78249194ec35\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_62ed316cda7b75735b20307b47e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_e1854ef3b023aaf8f417c99fa4a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_0527bc6a59e81ecc579c28600e7\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_616740222f408bbf5f5fcdecd66\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_6289dee12effb51320051c6f1fc\``
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
      `ALTER TABLE \`templates_set\` DROP FOREIGN KEY \`FK_eb0176ef4b98c143322aa6f8090\``
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
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_deceb07e75a8600e38d5de14a89\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_9929313cdeadf891732eedac290\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_766f8d8f48a8cd59f7fa919d162\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_c52470717008d58ec6d76b12ffa\``
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` DROP FOREIGN KEY \`FK_d1d94dd8e0c417b4188a05ccbca\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_08d1ccc94b008dbda894a3cfa20\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_fcabc1f3aa38aca70df4f66e938\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_50a7f6aa62426a0d3a9fb98b927\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_1dc9521a013c92854e92e099335\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` DROP FOREIGN KEY \`FK_bd3c7c6c2dbc2a8daf4b1500a69\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` DROP FOREIGN KEY \`FK_353b042af56f01ce222f08abf49\``
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
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_7fbe50fa78a37776ad962cb7643\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_6e7584bfb417bd0f8e8696ab585\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP FOREIGN KEY \`FK_eb99e588873c788a68a035478ab\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP FOREIGN KEY \`FK_a20c5901817dd09d5906537e087\``
    );
    await queryRunner.query(
      `ALTER TABLE \`updates\` DROP FOREIGN KEY \`FK_c69da93b39aa0a8c5cacd60a5e0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_c6a084fe80d01c41d9f142d51aa\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_2d8a3ca181c3f0346817685d21d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_4555dccdda9ba57d8e3a634cd0d\``
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
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_0bf5e52d71b2665f216b06433c1\``
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
      `ALTER TABLE \`storage_bucket\` DROP FOREIGN KEY \`FK_157c3de98a49f752d8385fe4d96\``
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
      `ALTER TABLE \`credential\` DROP FOREIGN KEY \`FK_dbe0929355f82e5995f0b7fd5e2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` DROP FOREIGN KEY \`FK_8ed9d1af584fa62f1ad3405b33b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` DROP FOREIGN KEY \`FK_36c8905c2c6c59467c60d94fd8a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` DROP FOREIGN KEY \`FK_b411e4f27d77a96eccdabbf4b45\``
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP FOREIGN KEY \`FK_2f46c698fc4c19a8cc233c5f255\``
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP FOREIGN KEY \`FK_73e8ae665a49366ca7e2866a45d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP FOREIGN KEY \`FK_432056041df0e4337b17ff7b09d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP FOREIGN KEY \`FK_a96475631aba7dce41db03cc8b2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP FOREIGN KEY \`FK_1104f3ef8497ca40d99b9f46b87\``
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP FOREIGN KEY \`FK_4fbd109f9bb84f58b7a3c60649c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` DROP FOREIGN KEY \`FK_81fc213b2d9ad0cddeab1a9ce64\``
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` DROP FOREIGN KEY \`FK_eb59b98ee6ef26c993d0d75c83c\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_fe50118fd82e7fe2f74f986a19\` ON \`application_questions\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_8495fae86f13836b0745642baa\` ON \`application_questions\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_18c7e16ae2a8cd33a690045566\` ON \`challenge\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_88592bee71718eec66a3bfc63f\` ON \`challenge\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b025a2720e5ee0e5b38774f7a8\` ON \`challenge\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_3c535130cde781b69259eec7d8\` ON \`challenge\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_aa9668dd2340c2d794b414577b\` ON \`challenge\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_1deebaabfc620e881858333b0d\` ON \`challenge\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_d4551f18fed106ae2e20c70f7c\` ON \`challenge\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_eedbe52ec6041ac337528d3dd0\` ON \`challenge\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_178fa41e46fd331f3501a62f6b\` ON \`challenge\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c814aa7dc8a68f27d96d5d1782\` ON \`opportunity\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6860f1e3ae5509245bdb5c401f\` ON \`opportunity\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_1c7744df92f39ab567084fd8c0\` ON \`opportunity\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_9c169eb500e2d3823154c7b603\` ON \`opportunity\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_fa617e79d6b2926edc7b4a3878\` ON \`opportunity\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_28129cec24e65cc8340ecd1284\` ON \`opportunity\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a344b754f33792cbbc58e41e89\` ON \`opportunity\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_f425931bb61a95ef6f6d89c9a8\` ON \`project\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6814b5d57d931283b1a2a1908c\` ON \`project\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_fac8673f44e6b295e30d1c1739\` ON \`project\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_22348b89c2f802a3d75d52fbd5\` ON \`agreement\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_24485ae3ec713db56648ef8ef9\` ON \`hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_59c8a5b7c5e4faff050e8b1ccf\` ON \`hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_97f76b96209eabf9ecc42b0f53\` ON \`hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_cb7bffcb96f77f1cbd4fe7415d\` ON \`hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_0ba883dcddf3e7f55a0db3c8ca\` ON \`hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_e3c654c355c81dcdbe7492b2a7\` ON \`hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_3da8c600d1a01e741cc47d23d7\` ON \`hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_ea92594bb43e50c9c1be21da8c\` ON \`hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6325f4ef25c4e07e723a96ed37\` ON \`hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_7642bbebcf21b02809de36624a\` ON \`hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_d74624956206f278a391b58623\` ON \`hub\``
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
      `DROP INDEX \`REL_262ecf3f5d70b82a4833618425\` ON \`collaboration\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_53fccd56207915b969b91834e0\` ON \`relation\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_62ed316cda7b75735b20307b47\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_e1854ef3b023aaf8f417c99fa4\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_0527bc6a59e81ecc579c28600e\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_616740222f408bbf5f5fcdecd6\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6289dee12effb51320051c6f1f\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_4a9c8cefc6c7e33aa728d22a90\` ON \`post_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c3bdb693adb031b6613edcef4f\` ON \`post_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_eb0176ef4b98c143322aa6f809\` ON \`templates_set\``
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
      `DROP INDEX \`REL_9929313cdeadf891732eedac29\` ON \`aspect\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_766f8d8f48a8cd59f7fa919d16\` ON \`aspect\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c52470717008d58ec6d76b12ff\` ON \`aspect\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_d1d94dd8e0c417b4188a05ccbc\` ON \`room\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_08d1ccc94b008dbda894a3cfa2\` ON \`canvas\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_50a7f6aa62426a0d3a9fb98b92\` ON \`canvas\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_1dc9521a013c92854e92e09933\` ON \`canvas\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_bd3c7c6c2dbc2a8daf4b1500a6\` ON \`canvas_checkout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_353b042af56f01ce222f08abf4\` ON \`canvas_checkout\``
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
      `DROP INDEX \`REL_7fbe50fa78a37776ad962cb764\` ON \`community\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6e7584bfb417bd0f8e8696ab58\` ON \`community\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_eb99e588873c788a68a035478a\` ON \`communication\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a20c5901817dd09d5906537e08\` ON \`communication\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c69da93b39aa0a8c5cacd60a5e\` ON \`updates\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_2d8a3ca181c3f0346817685d21\` ON \`discussion\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_4555dccdda9ba57d8e3a634cd0\` ON \`discussion\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_7ec2857c7d8d16432ffca1cb3d\` ON \`application\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_56f5614fff0028d40370499582\` ON \`application\``
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
      `DROP INDEX \`REL_0bf5e52d71b2665f216b06433c\` ON \`organization\``
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
      `DROP INDEX \`REL_f2f48b57269987b13b415a0058\` ON \`storage_bucket\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_9fb9257b14ec21daf5bc9aa4c8\` ON \`document\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_d9e2dfcccf59233c17cc6bc641\` ON \`document\``
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
      `DROP INDEX \`REL_8ed9d1af584fa62f1ad3405b33\` ON \`agent\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_73e8ae665a49366ca7e2866a45\` ON \`reference\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_432056041df0e4337b17ff7b09\` ON \`profile\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a96475631aba7dce41db03cc8b\` ON \`profile\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_4fbd109f9bb84f58b7a3c60649\` ON \`visual\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_eb59b98ee6ef26c993d0d75c83\` ON \`tagset\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` DROP PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` ADD PRIMARY KEY (\`applicationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` DROP COLUMN \`nvpId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` ADD \`nvpId\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_fe50118fd82e7fe2f74f986a19\` ON \`application_questions\` (\`nvpId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` DROP PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` ADD PRIMARY KEY (\`nvpId\`, \`applicationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` DROP PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` ADD PRIMARY KEY (\`nvpId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` DROP COLUMN \`applicationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` ADD \`applicationId\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_8495fae86f13836b0745642baa\` ON \`application_questions\` (\`applicationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` DROP PRIMARY KEY`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` ADD PRIMARY KEY (\`applicationId\`, \`nvpId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP INDEX \`IDX_18c7e16ae2a8cd33a690045566\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`storageBucketId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`storageBucketId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP INDEX \`IDX_88592bee71718eec66a3bfc63f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`preferenceSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`preferenceSetId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`parentChallengeId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`parentChallengeId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP INDEX \`IDX_b025a2720e5ee0e5b38774f7a8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`agentId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`agentId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_b025a2720e5ee0e5b38774f7a8\` ON \`challenge\` (\`agentId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP INDEX \`IDX_3c535130cde781b69259eec7d8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`lifecycleId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`lifecycleId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_3c535130cde781b69259eec7d8\` ON \`challenge\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP INDEX \`IDX_aa9668dd2340c2d794b414577b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`communityId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`communityId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_aa9668dd2340c2d794b414577b\` ON \`challenge\` (\`communityId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP INDEX \`IDX_1deebaabfc620e881858333b0d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`contextId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`contextId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_1deebaabfc620e881858333b0d\` ON \`challenge\` (\`contextId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP INDEX \`IDX_d4551f18fed106ae2e20c70f7c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`collaborationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`collaborationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP INDEX \`IDX_eedbe52ec6041ac337528d3dd0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`profileId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP INDEX \`IDX_178fa41e46fd331f3501a62f6b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_178fa41e46fd331f3501a62f6b\` ON \`challenge\` (\`authorizationId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`challenge\` DROP COLUMN \`hubID\``);
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`hubID\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`challenge\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`nameID\` varchar(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`challenge\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_7d2b222d54b900071b0959f03ef\` FOREIGN KEY (\`parentChallengeId\`) REFERENCES \`challenge\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`challengeId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`challengeId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP INDEX \`IDX_c814aa7dc8a68f27d96d5d1782\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`agentId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`agentId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c814aa7dc8a68f27d96d5d1782\` ON \`opportunity\` (\`agentId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP INDEX \`IDX_6860f1e3ae5509245bdb5c401f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`lifecycleId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`lifecycleId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_6860f1e3ae5509245bdb5c401f\` ON \`opportunity\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP INDEX \`IDX_1c7744df92f39ab567084fd8c0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`communityId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`communityId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_1c7744df92f39ab567084fd8c0\` ON \`opportunity\` (\`communityId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP INDEX \`IDX_9c169eb500e2d3823154c7b603\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`contextId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`contextId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_9c169eb500e2d3823154c7b603\` ON \`opportunity\` (\`contextId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP INDEX \`IDX_fa617e79d6b2926edc7b4a3878\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`collaborationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`collaborationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP INDEX \`IDX_28129cec24e65cc8340ecd1284\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`profileId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP INDEX \`IDX_a344b754f33792cbbc58e41e89\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a344b754f33792cbbc58e41e89\` ON \`opportunity\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`hubID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`hubID\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`nameID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`nameID\` varchar(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`opportunity\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_0e2c355dbb2950851dbc17a4490\` FOREIGN KEY (\`challengeId\`) REFERENCES \`challenge\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP COLUMN \`opportunityId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD \`opportunityId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP INDEX \`IDX_f425931bb61a95ef6f6d89c9a8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP COLUMN \`lifecycleId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD \`lifecycleId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_f425931bb61a95ef6f6d89c9a8\` ON \`project\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP INDEX \`IDX_6814b5d57d931283b1a2a1908c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD \`profileId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP INDEX \`IDX_fac8673f44e6b295e30d1c1739\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_fac8673f44e6b295e30d1c1739\` ON \`project\` (\`authorizationId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`project\` DROP COLUMN \`hubID\``);
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD \`hubID\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`project\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD \`nameID\` varchar(36) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`project\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`project\` ADD PRIMARY KEY (\`id\`)`);
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD CONSTRAINT \`FK_35e34564793a27bb3c209a15245\` FOREIGN KEY (\`opportunityId\`) REFERENCES \`opportunity\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`agreement\` DROP INDEX \`IDX_22348b89c2f802a3d75d52fbd5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`agreement\` DROP COLUMN \`tagsetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`agreement\` ADD \`tagsetId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_22348b89c2f802a3d75d52fbd5\` ON \`agreement\` (\`tagsetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`agreement\` DROP COLUMN \`projectId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`agreement\` ADD \`projectId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`agreement\` CHANGE \`description\` \`description\` text NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`agreement\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`agreement\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`agreement\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`agreement\` ADD CONSTRAINT \`FK_8785b5a8510cabcc25d0f196783\` FOREIGN KEY (\`projectId\`) REFERENCES \`project\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP INDEX \`IDX_24485ae3ec713db56648ef8ef9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP COLUMN \`storageBucketId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`storageBucketId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP INDEX \`IDX_97f76b96209eabf9ecc42b0f53\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP COLUMN \`templatesSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`templatesSetId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP INDEX \`IDX_cb7bffcb96f77f1cbd4fe7415d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP COLUMN \`preferenceSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`preferenceSetId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP INDEX \`IDX_0ba883dcddf3e7f55a0db3c8ca\``
    );
    await queryRunner.query(`ALTER TABLE \`hub\` DROP COLUMN \`agentId\``);
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`agentId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP INDEX \`IDX_e3c654c355c81dcdbe7492b2a7\``
    );
    await queryRunner.query(`ALTER TABLE \`hub\` DROP COLUMN \`lifecycleId\``);
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`lifecycleId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP INDEX \`IDX_3da8c600d1a01e741cc47d23d7\``
    );
    await queryRunner.query(`ALTER TABLE \`hub\` DROP COLUMN \`communityId\``);
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`communityId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP INDEX \`IDX_ea92594bb43e50c9c1be21da8c\``
    );
    await queryRunner.query(`ALTER TABLE \`hub\` DROP COLUMN \`contextId\``);
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`contextId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP INDEX \`IDX_6325f4ef25c4e07e723a96ed37\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP COLUMN \`collaborationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`collaborationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP INDEX \`IDX_7642bbebcf21b02809de36624a\``
    );
    await queryRunner.query(`ALTER TABLE \`hub\` DROP COLUMN \`profileId\``);
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`profileId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP INDEX \`IDX_d74624956206f278a391b58623\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` CHANGE \`visibility\` \`visibility\` varchar(255) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`hub\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`nameID\` varchar(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`hub\` DROP COLUMN \`id\``);
    await queryRunner.query(`ALTER TABLE \`hub\` ADD \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`hub\` ADD PRIMARY KEY (\`id\`)`);
    await queryRunner.query(
      `ALTER TABLE \`timeline\` DROP INDEX \`IDX_56aae15a664b2889a1a11c2cf8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` DROP COLUMN \`calendarId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` ADD \`calendarId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` DROP INDEX \`IDX_5fe58ece01b48496aebc04733d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`timeline\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`timeline\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar\` DROP INDEX \`IDX_6e74d59afda096b68d12a69969\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`calendar\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`calendar\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP COLUMN \`calendarId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD \`calendarId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP INDEX \`IDX_b5069b11030e9608ee4468f850\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP COLUMN \`commentsId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD \`commentsId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP INDEX \`IDX_9349e137959f3ca5818c2e62b3\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD \`profileId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP INDEX \`IDX_8ee86afa2808a4ab523b9ee6c5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` CHANGE \`durationDays\` \`durationDays\` int NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` CHANGE \`durationMinutes\` \`durationMinutes\` int NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` CHANGE \`multipleDays\` \`multipleDays\` tinyint NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` CHANGE \`wholeDay\` \`wholeDay\` tinyint NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` CHANGE \`startDate\` \`startDate\` datetime(6) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP COLUMN \`createdBy\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD \`createdBy\` char(36) NULL DEFAULT 'NULL'`
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
      `ALTER TABLE \`calendar_event\` DROP COLUMN \`id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP INDEX \`IDX_262ecf3f5d70b82a4833618425\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_262ecf3f5d70b82a4833618425\` ON \`collaboration\` (\`authorizationId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`collaboration\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_d4551f18fed106ae2e20c70f7cb\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_fa617e79d6b2926edc7b4a3878f\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_6325f4ef25c4e07e723a96ed37c\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` DROP COLUMN \`collaborationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` ADD \`collaborationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` DROP INDEX \`IDX_53fccd56207915b969b91834e0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_53fccd56207915b969b91834e0\` ON \`relation\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` CHANGE \`description\` \`description\` text NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`relation\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`relation\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` ADD CONSTRAINT \`FK_701a6f8e3e1da76354571767c3f\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`collaborationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`collaborationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP INDEX \`IDX_62ed316cda7b75735b20307b47\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`commentsId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`commentsId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP INDEX \`IDX_e1854ef3b023aaf8f417c99fa4\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`whiteboardTemplateId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`whiteboardTemplateId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP INDEX \`IDX_0527bc6a59e81ecc579c28600e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`postTemplateId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`postTemplateId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP INDEX \`IDX_616740222f408bbf5f5fcdecd6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`profileId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP INDEX \`IDX_6289dee12effb51320051c6f1f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_6289dee12effb51320051c6f1f\` ON \`callout\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` CHANGE \`publishedDate\` \`publishedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` CHANGE \`publishedBy\` \`publishedBy\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` CHANGE \`sortOrder\` \`sortOrder\` int NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` CHANGE \`group\` \`group\` varchar(32) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` CHANGE \`createdBy\` \`createdBy\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`callout\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`nameID\` varchar(36) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`callout\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`callout\` ADD PRIMARY KEY (\`id\`)`);
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_9b1c5ee044611ac78249194ec35\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` DROP COLUMN \`templatesSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD \`templatesSetId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` DROP INDEX \`IDX_4a9c8cefc6c7e33aa728d22a90\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD \`profileId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` DROP INDEX \`IDX_c3bdb693adb031b6613edcef4f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`post_template\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` DROP INDEX \`IDX_eb0176ef4b98c143322aa6f809\``
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` CHANGE \`policy\` \`policy\` text NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`templates_set\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP COLUMN \`templatesSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD \`templatesSetId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP INDEX \`IDX_bd591d7403dabe091f6a116975\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD \`profileId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP INDEX \`IDX_3aec561629db1d65a9b2b3a788\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP COLUMN \`type\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD \`type\` varchar(128) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP COLUMN \`id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` DROP COLUMN \`templatesSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD \`templatesSetId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` DROP INDEX \`IDX_5b4948db27c348e65055187d5e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD \`profileId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` DROP INDEX \`IDX_cc2faf30ce52648db9299d7072\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` DROP COLUMN \`id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`calloutId\``);
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`calloutId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP INDEX \`IDX_9929313cdeadf891732eedac29\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP COLUMN \`commentsId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`commentsId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP INDEX \`IDX_766f8d8f48a8cd59f7fa919d16\``
    );
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`profileId\``);
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`profileId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP INDEX \`IDX_c52470717008d58ec6d76b12ff\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c52470717008d58ec6d76b12ff\` ON \`aspect\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` CHANGE \`createdBy\` \`createdBy\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`type\``);
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`type\` varchar(255) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`nameID\` varchar(36) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`aspect\` ADD PRIMARY KEY (\`id\`)`);
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_deceb07e75a8600e38d5de14a89\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` DROP INDEX \`IDX_d1d94dd8e0c417b4188a05ccbc\``
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`room\` DROP COLUMN \`type\``);
    await queryRunner.query(
      `ALTER TABLE \`room\` ADD \`type\` varchar(255) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`room\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`room\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`room\` ADD PRIMARY KEY (\`id\`)`);
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_62ed316cda7b75735b20307b47e\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP INDEX \`IDX_08d1ccc94b008dbda894a3cfa2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP COLUMN \`checkoutId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`checkoutId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_08d1ccc94b008dbda894a3cfa2\` ON \`canvas\` (\`checkoutId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`canvas\` DROP COLUMN \`calloutId\``);
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`calloutId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP INDEX \`IDX_50a7f6aa62426a0d3a9fb98b92\``
    );
    await queryRunner.query(`ALTER TABLE \`canvas\` DROP COLUMN \`profileId\``);
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`profileId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP INDEX \`IDX_1dc9521a013c92854e92e09933\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_1dc9521a013c92854e92e09933\` ON \`canvas\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` CHANGE \`createdBy\` \`createdBy\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`canvas\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`nameID\` varchar(36) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`canvas\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`canvas\` ADD PRIMARY KEY (\`id\`)`);
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_fcabc1f3aa38aca70df4f66e938\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` DROP INDEX \`IDX_bd3c7c6c2dbc2a8daf4b1500a6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` DROP COLUMN \`lifecycleId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` ADD \`lifecycleId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_bd3c7c6c2dbc2a8daf4b1500a6\` ON \`canvas_checkout\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` DROP INDEX \`IDX_353b042af56f01ce222f08abf4\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_353b042af56f01ce222f08abf4\` ON \`canvas_checkout\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` DROP COLUMN \`id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_08d1ccc94b008dbda894a3cfa20\` FOREIGN KEY (\`checkoutId\`) REFERENCES \`canvas_checkout\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` DROP INDEX \`IDX_a03169c3f86480ba3863924f4d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` DROP COLUMN \`ecosystemModelId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD \`ecosystemModelId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a03169c3f86480ba3863924f4d\` ON \`context\` (\`ecosystemModelId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` DROP INDEX \`IDX_5f0dbc3b097ef297bd5f4ddb1a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_5f0dbc3b097ef297bd5f4ddb1a\` ON \`context\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` CHANGE \`who\` \`who\` text NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` CHANGE \`impact\` \`impact\` text NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` CHANGE \`vision\` \`vision\` text NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`context\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`context\` ADD PRIMARY KEY (\`id\`)`);
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_1deebaabfc620e881858333b0d0\` FOREIGN KEY (\`contextId\`) REFERENCES \`context\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_9c169eb500e2d3823154c7b603d\` FOREIGN KEY (\`contextId\`) REFERENCES \`context\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` DROP INDEX \`IDX_658580aea4e1a892227e27db90\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_658580aea4e1a892227e27db90\` ON \`ecosystem_model\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` CHANGE \`description\` \`description\` varchar(255) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` DROP COLUMN \`id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD CONSTRAINT \`FK_a03169c3f86480ba3863924f4d7\` FOREIGN KEY (\`ecosystemModelId\`) REFERENCES \`ecosystem_model\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` DROP COLUMN \`ecosystemModelId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` ADD \`ecosystemModelId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` DROP INDEX \`IDX_bde98d59e8984e7d17034c3b93\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_bde98d59e8984e7d17034c3b93\` ON \`actor_group\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` CHANGE \`description\` \`description\` text NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`actor_group\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` ADD CONSTRAINT \`FK_cbb1d7afa052a184471723d3297\` FOREIGN KEY (\`ecosystemModelId\`) REFERENCES \`ecosystem_model\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` DROP COLUMN \`actorGroupId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` ADD \`actorGroupId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` DROP INDEX \`IDX_a2afa3851ea733de932251b3a1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a2afa3851ea733de932251b3a1\` ON \`actor\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` CHANGE \`impact\` \`impact\` varchar(255) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` CHANGE \`value\` \`value\` text NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` CHANGE \`description\` \`description\` text NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`actor\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`actor\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`actor\` ADD PRIMARY KEY (\`id\`)`);
    await queryRunner.query(
      `ALTER TABLE \`actor\` ADD CONSTRAINT \`FK_0f9d41ee193d631a5439bb4f404\` FOREIGN KEY (\`actorGroupId\`) REFERENCES \`actor_group\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`parentCommunityId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`parentCommunityId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP INDEX \`IDX_3823de95920943655430125fa9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`policyId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`policyId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP INDEX \`IDX_c7d74dd6b92d4202c705cd3676\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`applicationFormId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`applicationFormId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP INDEX \`IDX_7fbe50fa78a37776ad962cb764\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`communicationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`communicationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP INDEX \`IDX_6e7584bfb417bd0f8e8696ab58\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_6e7584bfb417bd0f8e8696ab58\` ON \`community\` (\`authorizationId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`community\` DROP COLUMN \`hubID\``);
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`hubID\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`community\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_aa9668dd2340c2d794b414577b6\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_1c7744df92f39ab567084fd8c09\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_8e8283bdacc9e770918fe689333\` FOREIGN KEY (\`parentCommunityId\`) REFERENCES \`community\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`form\` CHANGE \`description\` \`description\` text NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`form\` CHANGE \`questions\` \`questions\` text NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`form\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`form\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`form\` ADD PRIMARY KEY (\`id\`)`);
    await queryRunner.query(
      `ALTER TABLE \`community_policy\` CHANGE \`lead\` \`lead\` text NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_policy\` CHANGE \`member\` \`member\` text NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_policy\` DROP COLUMN \`id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community_policy\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_policy\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP INDEX \`IDX_eb99e588873c788a68a035478a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP COLUMN \`updatesId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD \`updatesId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP INDEX \`IDX_a20c5901817dd09d5906537e08\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a20c5901817dd09d5906537e08\` ON \`communication\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` CHANGE \`discussionCategories\` \`discussionCategories\` text NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP COLUMN \`hubID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD \`hubID\` char(36) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`communication\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_7fbe50fa78a37776ad962cb7643\` FOREIGN KEY (\`communicationId\`) REFERENCES \`communication\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`updates\` DROP INDEX \`IDX_c69da93b39aa0a8c5cacd60a5e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`updates\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`updates\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`updates\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`updates\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`updates\` ADD PRIMARY KEY (\`id\`)`);
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP COLUMN \`communicationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD \`communicationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP INDEX \`IDX_2d8a3ca181c3f0346817685d21\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD \`profileId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP INDEX \`IDX_4555dccdda9ba57d8e3a634cd0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_4555dccdda9ba57d8e3a634cd0\` ON \`discussion\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` CHANGE \`createdBy\` \`createdBy\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP COLUMN \`nameID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD \`nameID\` varchar(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`discussion\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_c6a084fe80d01c41d9f142d51aa\` FOREIGN KEY (\`communicationId\`) REFERENCES \`communication\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP COLUMN \`communityId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD \`communityId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP COLUMN \`userId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD \`userId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP INDEX \`IDX_7ec2857c7d8d16432ffca1cb3d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP COLUMN \`lifecycleId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD \`lifecycleId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_7ec2857c7d8d16432ffca1cb3d\` ON \`application\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP INDEX \`IDX_56f5614fff0028d40370499582\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_56f5614fff0028d40370499582\` ON \`application\` (\`authorizationId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`application\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD CONSTRAINT \`FK_500cee6f635849f50e19c7e2b76\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP INDEX \`IDX_028322b763dc94242dc9f638f9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP COLUMN \`preferenceSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`preferenceSetId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP INDEX \`IDX_b61c694cacfab25533bd23d9ad\``
    );
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`agentId\``);
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`agentId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_b61c694cacfab25533bd23d9ad\` ON \`user\` (\`agentId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP INDEX \`IDX_9466682df91534dd95e4dbaa61\``
    );
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`profileId\``);
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`profileId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_9466682df91534dd95e4dbaa61\` ON \`user\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP INDEX \`IDX_09f909622aa177a097256b7cc2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_09f909622aa177a097256b7cc2\` ON \`user\` (\`authorizationId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`nameID\` varchar(36) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` CHANGE \`rowId\` \`rowId\` int NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`user\` ADD PRIMARY KEY (\`id\`)`);
    await queryRunner.query(
      `ALTER TABLE \`user\` CHANGE \`rowId\` \`rowId\` int NOT NULL AUTO_INCREMENT`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD CONSTRAINT \`FK_b4ae3fea4a24b4be1a86dacf8a2\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(`ALTER TABLE \`nvp\` DROP COLUMN \`value\``);
    await queryRunner.query(
      `ALTER TABLE \`nvp\` ADD \`value\` varchar(512) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`nvp\` DROP COLUMN \`id\``);
    await queryRunner.query(`ALTER TABLE \`nvp\` ADD \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`nvp\` ADD PRIMARY KEY (\`id\`)`);
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP COLUMN \`communityId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD \`communityId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP COLUMN \`organizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD \`organizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP INDEX \`IDX_9912e4cfc1e09848a392a65151\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD \`profileId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_9912e4cfc1e09848a392a65151\` ON \`user_group\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP INDEX \`IDX_e8e32f1e59c349b406a4752e54\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_e8e32f1e59c349b406a4752e54\` ON \`user_group\` (\`authorizationId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`user_group\` DROP COLUMN \`hubID\``);
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD \`hubID\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`user_group\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD CONSTRAINT \`FK_9fcc131f256e969d773327f07cb\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP INDEX \`IDX_0bf5e52d71b2665f216b06433c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP COLUMN \`storageBucketId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD \`storageBucketId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP INDEX \`IDX_58fd47c4a6ac8df9fe2bcaed87\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP COLUMN \`preferenceSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD \`preferenceSetId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP INDEX \`IDX_5a72d5b37312bac2e0a0115718\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP COLUMN \`verificationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD \`verificationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP INDEX \`IDX_7f1bec8979b57ed7ebd392a2ca\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP COLUMN \`agentId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD \`agentId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP INDEX \`IDX_d2cb77c14644156ec8e865608e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD \`profileId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP INDEX \`IDX_e0e150e4f11d906b931b46a2d8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP INDEX \`IDX_9fdd8f0bfe04a676822c7265e1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP COLUMN \`nameID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD \`nameID\` varchar(36) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`organization\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` CHANGE \`rowId\` \`rowId\` int NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` CHANGE \`rowId\` \`rowId\` int NOT NULL AUTO_INCREMENT`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` DROP COLUMN \`parentStorageBucketId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` ADD \`parentStorageBucketId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` DROP INDEX \`IDX_f2f48b57269987b13b415a0058\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` CHANGE \`maxFileSize\` \`maxFileSize\` int NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` CHANGE \`allowedMimeTypes\` \`allowedMimeTypes\` text NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` DROP COLUMN \`id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP INDEX \`IDX_9fb9257b14ec21daf5bc9aa4c8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP COLUMN \`tagsetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD \`tagsetId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP COLUMN \`storageBucketId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD \`storageBucketId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP INDEX \`IDX_d9e2dfcccf59233c17cc6bc641\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` CHANGE \`anonymousReadAccess\` \`anonymousReadAccess\` tinyint(1) NULL DEFAULT '0'`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` CHANGE \`externalID\` \`externalID\` varchar(128) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` CHANGE \`size\` \`size\` int NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` CHANGE \`mimeType\` \`mimeType\` varchar(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP COLUMN \`displayName\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD \`displayName\` varchar(255) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP COLUMN \`createdBy\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD \`createdBy\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`document\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_set\` DROP INDEX \`IDX_8e76dcf171c45875c44febb1d8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_set\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_set\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_set\` DROP COLUMN \`id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_set\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_set\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` DROP COLUMN \`preferenceSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD \`preferenceSetId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` DROP COLUMN \`preferenceDefinitionId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD \`preferenceDefinitionId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` DROP INDEX \`IDX_b4cf0f96bf08cf396f68355522\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`preference\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_definition\` DROP COLUMN \`id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_definition\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_definition\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` DROP INDEX \`IDX_1cc3b275fc2a9d9d9b0ae33b31\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` DROP COLUMN \`lifecycleId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` ADD \`lifecycleId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` DROP INDEX \`IDX_c66eddab0caacb1ef8d46bcafd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` DROP COLUMN \`organizationID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` ADD \`organizationID\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` DROP COLUMN \`id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`lifecycle\` CHANGE \`machineDef\` \`machineDef\` text NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`lifecycle\` CHANGE \`machineState\` \`machineState\` text NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`lifecycle\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`lifecycle\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`lifecycle\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_3c535130cde781b69259eec7d85\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_6860f1e3ae5509245bdb5c401f3\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD CONSTRAINT \`FK_f425931bb61a95ef6f6d89c9a85\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` ADD CONSTRAINT \`FK_bd3c7c6c2dbc2a8daf4b1500a69\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD CONSTRAINT \`FK_7ec2857c7d8d16432ffca1cb3d9\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`credential\` DROP COLUMN \`agentId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`credential\` ADD \`agentId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`credential\` DROP COLUMN \`resourceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`credential\` ADD \`resourceID\` char(36) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`credential\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`credential\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`credential\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` DROP INDEX \`IDX_8ed9d1af584fa62f1ad3405b33\``
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_8ed9d1af584fa62f1ad3405b33\` ON \`agent\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` CHANGE \`password\` \`password\` varchar(255) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` CHANGE \`did\` \`did\` varchar(255) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` CHANGE \`parentDisplayID\` \`parentDisplayID\` text NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`agent\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`agent\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`agent\` ADD PRIMARY KEY (\`id\`)`);
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_b025a2720e5ee0e5b38774f7a8c\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_c814aa7dc8a68f27d96d5d1782c\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_b61c694cacfab25533bd23d9add\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`credential\` ADD CONSTRAINT \`FK_dbe0929355f82e5995f0b7fd5e2\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` CHANGE \`profileId\` \`profileId\` varchar(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` CHANGE \`authorizationId\` \`authorizationId\` varchar(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` CHANGE \`hubListFilter\` \`hubListFilter\` text NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` CHANGE \`hubVisibilityFilter\` \`hubVisibilityFilter\` varchar(255) NULL DEFAULT 'NULL'`
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
      `ALTER TABLE \`reference\` DROP COLUMN \`profileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD \`profileId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP INDEX \`IDX_73e8ae665a49366ca7e2866a45\``
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_73e8ae665a49366ca7e2866a45\` ON \`reference\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` CHANGE \`description\` \`description\` text NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`reference\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP INDEX \`IDX_432056041df0e4337b17ff7b09\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP COLUMN \`locationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`locationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP INDEX \`IDX_a96475631aba7dce41db03cc8b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a96475631aba7dce41db03cc8b\` ON \`profile\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` CHANGE \`description\` \`description\` text NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`profile\` DROP COLUMN \`tagline\``);
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`tagline\` varchar(255) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP COLUMN \`displayName\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`displayName\` varchar(255) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(`ALTER TABLE \`profile\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`profile\` ADD PRIMARY KEY (\`id\`)`);
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_2d8a3ca181c3f0346817685d21d\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_9466682df91534dd95e4dbaa616\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD CONSTRAINT \`FK_9912e4cfc1e09848a392a651514\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD CONSTRAINT \`FK_36c8905c2c6c59467c60d94fd8a\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD CONSTRAINT \`FK_2f46c698fc4c19a8cc233c5f255\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` DROP COLUMN \`postalCode\``
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` ADD \`postalCode\` varchar(128) NOT NULL DEFAULT ''''`
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` DROP COLUMN \`stateOrProvince\``
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` ADD \`stateOrProvince\` varchar(128) NOT NULL DEFAULT ''''`
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` DROP COLUMN \`addressLine2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` ADD \`addressLine2\` varchar(128) NOT NULL DEFAULT ''''`
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` DROP COLUMN \`addressLine1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` ADD \`addressLine1\` varchar(128) NOT NULL DEFAULT ''''`
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` CHANGE \`country\` \`country\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` CHANGE \`city\` \`city\` varchar(255) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`location\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`location\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(`ALTER TABLE \`visual\` DROP COLUMN \`profileId\``);
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD \`profileId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP INDEX \`IDX_4fbd109f9bb84f58b7a3c60649\``
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` CHANGE \`alternativeText\` \`alternativeText\` varchar(120) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP COLUMN \`aspectRatio\``
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD \`aspectRatio\` float(12) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` CHANGE \`uri\` \`uri\` text NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`visual\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`visual\` ADD PRIMARY KEY (\`id\`)`);
    await queryRunner.query(`ALTER TABLE \`tagset\` DROP COLUMN \`profileId\``);
    await queryRunner.query(
      `ALTER TABLE \`tagset\` ADD \`profileId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` DROP INDEX \`IDX_eb59b98ee6ef26c993d0d75c83\``
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` ADD \`authorizationId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_eb59b98ee6ef26c993d0d75c83\` ON \`tagset\` (\`authorizationId\`)`
    );
    await queryRunner.query(`ALTER TABLE \`tagset\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`tagset\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`tagset\` ADD PRIMARY KEY (\`id\`)`);
    await queryRunner.query(
      `ALTER TABLE \`tagset\` ADD CONSTRAINT \`FK_81fc213b2d9ad0cddeab1a9ce64\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`agreement\` ADD CONSTRAINT \`FK_22348b89c2f802a3d75d52fbd57\` FOREIGN KEY (\`tagsetId\`) REFERENCES \`tagset\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`authorization_policy\` DROP COLUMN \`id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`authorization_policy\` ADD \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`authorization_policy\` ADD PRIMARY KEY (\`id\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_178fa41e46fd331f3501a62f6bf\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_a344b754f33792cbbc58e41e898\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD CONSTRAINT \`FK_fac8673f44e6b295e30d1c1739a\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_262ecf3f5d70b82a48336184251\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` ADD CONSTRAINT \`FK_53fccd56207915b969b91834e04\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_6289dee12effb51320051c6f1fc\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_1dc9521a013c92854e92e099335\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` ADD CONSTRAINT \`FK_353b042af56f01ce222f08abf49\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD CONSTRAINT \`FK_5f0dbc3b097ef297bd5f4ddb1a9\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` ADD CONSTRAINT \`FK_658580aea4e1a892227e27db902\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` ADD CONSTRAINT \`FK_bde98d59e8984e7d17034c3b937\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` ADD CONSTRAINT \`FK_a2afa3851ea733de932251b3a1f\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_6e7584bfb417bd0f8e8696ab585\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD CONSTRAINT \`FK_a20c5901817dd09d5906537e087\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_4555dccdda9ba57d8e3a634cd0d\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD CONSTRAINT \`FK_56f5614fff0028d403704995822\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_09f909622aa177a097256b7cc22\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD CONSTRAINT \`FK_e8e32f1e59c349b406a4752e545\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` ADD CONSTRAINT \`FK_8ed9d1af584fa62f1ad3405b33b\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD CONSTRAINT \`FK_b411e4f27d77a96eccdabbf4b45\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD CONSTRAINT \`FK_73e8ae665a49366ca7e2866a45d\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_a96475631aba7dce41db03cc8b2\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` ADD CONSTRAINT \`FK_eb59b98ee6ef26c993d0d75c83c\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`parentHubId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP INDEX \`IDX_59c8a5b7c5e4faff050e8b1ccf\``
    );
    await queryRunner.query(`ALTER TABLE \`hub\` DROP COLUMN \`timelineId\``);
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` DROP COLUMN \`canvasID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP COLUMN \`hubID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`parentHubID\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`timelineID\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` ADD \`canvasId\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD \`hubId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_d4551f18fed106ae2e20c70f7c\` ON \`challenge\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_88592bee71718eec66a3bfc63f\` ON \`challenge\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_fa617e79d6b2926edc7b4a3878\` ON \`opportunity\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_cfe913bad45e399cc0d828ebaf8\` ON \`hub\` (\`timelineID\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_6325f4ef25c4e07e723a96ed37\` ON \`hub\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_99990355b4e9bd6b02c66507aa\` ON \`hub\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_b0c3f360534db92017e36a00bb\` ON \`hub\` (\`agentId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_ec1a68698d32f610a5fc1880c7\` ON \`hub\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_f5ad15bcb06a95c2a109fbcce2\` ON \`hub\` (\`communityId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_6db8627abbf00b1b986e359054\` ON \`hub\` (\`contextId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_17a161eef37c9f07186532ab75\` ON \`hub\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_10ed346b16ca044cd84fb1c4034\` ON \`timeline\` (\`calendarId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_e6203bc09ec8b93debeb3a44cb9\` ON \`timeline\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_94994efc5eb5936ed70f2c55903\` ON \`calendar\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_111838434c7198a323ea6f475fb\` ON \`calendar_event\` (\`profileId\`)`
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
      `CREATE UNIQUE INDEX \`REL_c506eee0b7d06523b2953d0733\` ON \`callout\` (\`whiteboardTemplateId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_c506eee0b7d06523b2953d0733\` ON \`callout\` (\`whiteboardTemplateId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_22a2ec1b5bca6c54678ffb19eb\` ON \`callout\` (\`postTemplateId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_22a2ec1b5bca6c54678ffb19eb\` ON \`callout\` (\`postTemplateId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_44447ccdda9ba57d8e3a634cd8\` ON \`post_template\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_66666ccdda9ba57d8e3a634cd8\` ON \`templates_set\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_76542ccdda9ba57d8e3a634cd8\` ON \`innovation_flow_template\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_88888ccdda9ba57d8e3a634cd8\` ON \`whiteboard_template\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_67663901817dd09d5906537e088\` ON \`aspect\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c4fb636888fc391cf1d7406e89\` ON \`aspect\` (\`commentsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_c4fb636888fc391cf1d7406e89\` ON \`aspect\` (\`commentsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_7777dccdda9ba57d8e3a634cd8\` ON \`room\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_08d1ccc94b008dbda894a3cfa2\` ON \`canvas\` (\`checkoutId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_1dc9521a013c92854e92e09933\` ON \`canvas\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_c9ff67519d26140f98265a542e\` ON \`community\` (\`policyId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_7fbe50fa78a37776ad962cb764\` ON \`community\` (\`communicationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_7777dccdda9ba57d8e3a634cd0\` ON \`updates\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_88880355b4e9bd6b02c66507aa\` ON \`user\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_58fd47c4a6ac8df9fe2bcaed87\` ON \`organization\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_95bbac07221e98072beafa6173\` ON \`organization\` (\`verificationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_95bbac07221e98072beafa6173\` ON \`organization\` (\`verificationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_7671a7e33f6665764f4534a596\` ON \`organization\` (\`agentId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_037ba4b170844c039e74aa22ec\` ON \`organization\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_badc07674ce4e44801e5a5f36c\` ON \`organization\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_266bc44a18601f893566962df7\` ON \`organization\` (\`rowId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_77994efc5eb5936ed70f2c55903\` ON \`storage_bucket\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_8888dccdda9ba57d8e3a634cd8\` ON \`preference_set\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_49030bc57aa0f319cee7996fca\` ON \`preference\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_22be0d440df7972d9b3a94aa6d\` ON \`organization_verification\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_3795f9dd15ef3ef2dd1d27e309\` ON \`organization_verification\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_77777ca8ac212b8357637794d6\` ON \`profile\` (\`locationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_439d0b187986492b58178a82c3\` ON \`visual\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` ADD CONSTRAINT \`FK_fe50118fd82e7fe2f74f986a195\` FOREIGN KEY (\`nvpId\`) REFERENCES \`nvp\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` ADD CONSTRAINT \`FK_8495fae86f13836b0745642baa8\` FOREIGN KEY (\`applicationId\`) REFERENCES \`application\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_c890de5a08d363719a41703a638\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_81231450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_494b27cb13b59128fb24b365ca6\` FOREIGN KEY (\`parentHubID\`) REFERENCES \`hub\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_21991450cf75dc486700ca034c6\` FOREIGN KEY (\`storageBucketId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_91231450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD CONSTRAINT \`FK_49991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_f5ad15bcb06a95c2a109fbcce2a\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_ec1a68698d32f610a5fc1880c7f\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_b0c3f360534db92017e36a00bb2\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_71231450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_6db8627abbf00b1b986e359054f\` FOREIGN KEY (\`contextId\`) REFERENCES \`context\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_6bf7adf4308991457fdb04624e2\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_33336901817dd09d5906537e088\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_3005ed9ce3f57c250c59d6d5065\` FOREIGN KEY (\`timelineID\`) REFERENCES \`timeline\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_17a161eef37c9f07186532ab758\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_11991450cf75dc486700ca034c6\` FOREIGN KEY (\`storageBucketId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_157de0ce487e25bb69437e80b13\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_111838434c7198a323ea6f475fb\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_c506eee0b7d06523b2953d07337\` FOREIGN KEY (\`whiteboardTemplateId\`) REFERENCES \`whiteboard_template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_22a2ec1b5bca6c54678ffb19eb0\` FOREIGN KEY (\`postTemplateId\`) REFERENCES \`post_template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_19991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
      `ALTER TABLE \`templates_set\` ADD CONSTRAINT \`FK_66666901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
      `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_c4fb636888fc391cf1d7406e891\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_67663901817dd09d5906537e088\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_00a8c330495ef844bfc6975ec89\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` ADD CONSTRAINT \`FK_77775901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_29991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_35533901817dd09d5906537e088\` FOREIGN KEY (\`policyId\`) REFERENCES \`community_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_25543901817dd09d5906537e088\` FOREIGN KEY (\`applicationFormId\`) REFERENCES \`form\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD CONSTRAINT \`FK_777750fa78a37776ad962cb7643\` FOREIGN KEY (\`updatesId\`) REFERENCES \`updates\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`updates\` ADD CONSTRAINT \`FK_77775901817dd09d5906537e087\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_5ea996d22fbd9d522a59a39b74e\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD CONSTRAINT \`FK_2b8381df8c3a1680f50e4bc2351\` FOREIGN KEY (\`organizationId\`) REFERENCES \`organization\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_c07b5b4c96fa89cb80215827668\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`
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
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_51991450cf75dc486700ca034c6\` FOREIGN KEY (\`storageBucketId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_037ba4b170844c039e74aa22ecd\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
      `ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_77777ca8ac212b8357637794d6f\` FOREIGN KEY (\`locationId\`) REFERENCES \`location\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD CONSTRAINT \`FK_77771450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD CONSTRAINT \`FK_439d0b187986492b58178a82c3f\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }
}

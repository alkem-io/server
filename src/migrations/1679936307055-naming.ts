import { MigrationInterface, QueryRunner } from 'typeorm';

export class naming1679936307055 implements MigrationInterface {
  name = 'naming1679936307055';

  public async up(queryRunner: QueryRunner): Promise<void> {
    ///////// Lifecycle Template
    // Lifecycle_template ==> authorization
    await queryRunner.query(
      'ALTER TABLE `lifecycle_template` DROP FOREIGN KEY `FK_76546901817dd09d5906537e088`'
    );
    // lifecycle_template ==> profileId
    await queryRunner.query(
      'ALTER TABLE `lifecycle_template` DROP FOREIGN KEY `FK_79991450cf75dc486700ca034c6`'
    );
    // lifecycle_template ==> templatesSet
    await queryRunner.query(
      'ALTER TABLE `lifecycle_template` DROP FOREIGN KEY `FK_76546450cf75dc486700ca034c6`'
    );

    await queryRunner.query(
      'ALTER TABLE lifecycle_template RENAME TO innovation_flow_template'
    );

    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD CONSTRAINT \`FK_76546901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD CONSTRAINT \`FK_79991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD CONSTRAINT \`FK_76546450cf75dc486700ca034c6\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    ///////// Canvas Template
    // canvas_template ==> authorization
    await queryRunner.query(
      'ALTER TABLE `canvas_template` DROP FOREIGN KEY `FK_45556901817dd09d5906537e088`'
    );
    // canvas_template ==> profileId
    await queryRunner.query(
      'ALTER TABLE `canvas_template` DROP FOREIGN KEY `FK_69991450cf75dc486700ca034c6`'
    );
    // canvas_template ==> templatesSet
    await queryRunner.query(
      'ALTER TABLE `canvas_template` DROP FOREIGN KEY `FK_65556450cf75dc486700ca034c6`'
    );
    // callout ==> canvas_template
    await queryRunner.query(
      `ALTER TABLE \`callout\`  DROP FOREIGN KEY \`FK_c506eee0b7d06523b2953d07337\``
    );

    // rename
    await queryRunner.query(
      'ALTER TABLE canvas_template RENAME TO whiteboard_template'
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` RENAME COLUMN \`canvasTemplateId\` TO \`whiteboardTemplateId\``
    );

    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD CONSTRAINT \`FK_45556901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD CONSTRAINT \`FK_69991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD CONSTRAINT \`FK_65556450cf75dc486700ca034c6\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_c506eee0b7d06523b2953d07337\` FOREIGN KEY (\`whiteboardTemplateId\`) REFERENCES \`whiteboard_template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    ///////// Aspect Template
    // aspect_template ==> authorization
    await queryRunner.query(
      'ALTER TABLE `aspect_template` DROP FOREIGN KEY `FK_44446901817dd09d5906537e088`'
    );
    // aspect_template ==> profileId
    await queryRunner.query(
      'ALTER TABLE `aspect_template` DROP FOREIGN KEY `FK_59991450cf75dc486700ca034c6`'
    );
    // aspect_template ==> templatesSet
    await queryRunner.query(
      'ALTER TABLE `aspect_template` DROP FOREIGN KEY `FK_66666450cf75dc486700ca034c6`'
    );
    // callout ==> aspect_template
    await queryRunner.query(
      `ALTER TABLE \`callout\`  DROP FOREIGN KEY \`FK_22a2ec1b5bca6c54678ffb19eb0\``
    );

    // rename
    await queryRunner.query(
      'ALTER TABLE aspect_template RENAME TO post_template'
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` RENAME COLUMN \`cardTemplateId\` TO \`postTemplateId\``
    );

    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD CONSTRAINT \`FK_44446901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD CONSTRAINT \`FK_59991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD CONSTRAINT \`FK_66666450cf75dc486700ca034c6\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_22a2ec1b5bca6c54678ffb19eb0\` FOREIGN KEY (\`postTemplateId\`) REFERENCES \`post_template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Lifecycle_template ==> authorization
    await queryRunner.query(
      'ALTER TABLE `innovation_flow_template` DROP FOREIGN KEY `FK_76546901817dd09d5906537e088`'
    );
    // lifecycle_template ==> profileId
    await queryRunner.query(
      'ALTER TABLE `innovation_flow_template` DROP FOREIGN KEY `FK_79991450cf75dc486700ca034c6`'
    );
    // lifecycle_template ==> templatesSet
    await queryRunner.query(
      'ALTER TABLE `innovation_flow_template` DROP FOREIGN KEY `FK_76546450cf75dc486700ca034c6`'
    );

    await queryRunner.query(
      'ALTER TABLE innovation_flow_template RENAME TO lifecycle_template'
    );

    await queryRunner.query(
      `ALTER TABLE \`lifecycle_template\` ADD CONSTRAINT \`FK_76546901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`lifecycle_template\` ADD CONSTRAINT \`FK_79991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`lifecycle_template\` ADD CONSTRAINT \`FK_76546450cf75dc486700ca034c6\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    ///////// Canvas Template
    // canvas_template ==> authorization
    await queryRunner.query(
      'ALTER TABLE `whiteboard_template` DROP FOREIGN KEY `FK_45556901817dd09d5906537e088`'
    );
    // canvas_template ==> profileId
    await queryRunner.query(
      'ALTER TABLE `whiteboard_template` DROP FOREIGN KEY `FK_69991450cf75dc486700ca034c6`'
    );
    // canvas_template ==> templatesSet
    await queryRunner.query(
      'ALTER TABLE `whiteboard_template` DROP FOREIGN KEY `FK_65556450cf75dc486700ca034c6`'
    );
    // callout ==> canvas_template
    await queryRunner.query(
      `ALTER TABLE \`callout\`  DROP FOREIGN KEY \`FK_c506eee0b7d06523b2953d07337\``
    );

    await queryRunner.query(
      'ALTER TABLE whiteboard_template RENAME TO canvas_template'
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` RENAME COLUMN \`whiteboardTemplateId\` TO \`canvasTemplateId\``
    );

    await queryRunner.query(
      `ALTER TABLE \`canvas_template\` ADD CONSTRAINT \`FK_45556901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_template\` ADD CONSTRAINT \`FK_69991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_template\` ADD CONSTRAINT \`FK_65556450cf75dc486700ca034c6\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_c506eee0b7d06523b2953d07337\` FOREIGN KEY (\`canvasTemplateId\`) REFERENCES \`canvas_template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    ///////// Aspect Template
    // aspect_template ==> authorization
    await queryRunner.query(
      'ALTER TABLE `post_template` DROP FOREIGN KEY `FK_44446901817dd09d5906537e088`'
    );
    // aspect_template ==> profileId
    await queryRunner.query(
      'ALTER TABLE `post_template` DROP FOREIGN KEY `FK_59991450cf75dc486700ca034c6`'
    );
    // aspect_template ==> templatesSet
    await queryRunner.query(
      'ALTER TABLE `post_template` DROP FOREIGN KEY `FK_66666450cf75dc486700ca034c6`'
    );
    // callout ==> aspect_template
    await queryRunner.query(
      `ALTER TABLE \`callout\`  DROP FOREIGN KEY \`FK_22a2ec1b5bca6c54678ffb19eb0\``
    );

    // rename
    await queryRunner.query(
      'ALTER TABLE post_template RENAME TO aspect_template'
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` RENAME COLUMN \`postTemplateId\` TO \`cardTemplateId\``
    );

    await queryRunner.query(
      `ALTER TABLE \`aspect_template\` ADD CONSTRAINT \`FK_44446901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect_template\` ADD CONSTRAINT \`FK_59991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect_template\` ADD CONSTRAINT \`FK_66666450cf75dc486700ca034c6\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_22a2ec1b5bca6c54678ffb19eb0\` FOREIGN KEY (\`cardTemplateId\`) REFERENCES \`aspect_template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }
}

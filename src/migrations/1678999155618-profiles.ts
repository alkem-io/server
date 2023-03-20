import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { escapeString } from './utils/escape-string';

export class profiles1678999155618 implements MigrationInterface {
  name = 'profiles1678999155618';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Extend Callout / Canvas / InnovationPack / Project / AspectTemplate
    // LifecycleTemplate / CanvasTemplate with profiles
    await this.addProfileRelation(
      queryRunner,
      'FK_19991450cf75dc486700ca034c6',
      'callout'
    );
    await this.addProfileRelation(
      queryRunner,
      'FK_29991450cf75dc486700ca034c6',
      'canvas'
    );
    await this.addProfileRelation(
      queryRunner,
      'FK_39991450cf75dc486700ca034c6',
      'innovation_pack'
    );
    await this.addProfileRelation(
      queryRunner,
      'FK_49991450cf75dc486700ca034c6',
      'project'
    );
    await this.addProfileRelation(
      queryRunner,
      'FK_59991450cf75dc486700ca034c6',
      'aspect_template'
    );
    await this.addProfileRelation(
      queryRunner,
      'FK_69991450cf75dc486700ca034c6',
      'canvas_template'
    );
    await this.addProfileRelation(
      queryRunner,
      'FK_79991450cf75dc486700ca034c6',
      'lifecycle_template'
    );

    // remove existing FKs that will no longer apply
    // CanvasTemplate ==> TemplateInfo
    await queryRunner.query(
      `ALTER TABLE \`canvas_template\` DROP FOREIGN KEY \`FK_65557901817dd09d5906537e088\``
    );
    // AspectTemplate ==> TemplateInfo
    await queryRunner.query(
      `ALTER TABLE \`aspect_template\` DROP FOREIGN KEY \`FK_66667901817dd09d5906537e088\``
    );
    // LifecycleTemplate ==> TemplateInfo
    await queryRunner.query(
      `ALTER TABLE \`lifecycle_template\` DROP FOREIGN KEY \`FK_76547901817dd09d5906537e088\``
    );
    // Project ==> tagset
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP FOREIGN KEY \`FK_d07535c59062f86e887de8f0a57\``
    );
    // TemplateInfo ==> tagset
    await queryRunner.query(
      `ALTER TABLE \`template_info\` DROP FOREIGN KEY \`FK_77777901817dd09d5906537e088\``
    );
    // TemplateInfo ==> Visual
    await queryRunner.query(
      `ALTER TABLE \`template_info\` DROP FOREIGN KEY \`FK_88888901817dd09d5906537e088\``
    );
    // Canvas ==> Visual
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_c7b34f838919f526f829295cf86\``
    );

    //////////////////////////////
    // Migrate the data
    const callouts: any[] = await queryRunner.query(
      `SELECT id, displayName, description from callout`
    );
    for (const callout of callouts) {
      await this.createProfileAndLink(
        queryRunner,
        'callout',
        callout.id,
        callout.displayName,
        callout.description
      );
    }

    const canvases: any[] = await queryRunner.query(
      `SELECT id, displayName, previewId from canvas`
    );
    for (const canvas of canvases) {
      const profileID = await this.createProfileAndLink(
        queryRunner,
        'canvas',
        canvas.id,
        canvas.displayName,
        ''
      );
      // Update the visuals to be parented on the new profile
      await queryRunner.query(
        `UPDATE visual SET profileId = '${profileID}' WHERE (id = '${canvas.previewId}')`
      );
    }

    const packs: any[] = await queryRunner.query(
      `SELECT id, displayName from innovation_pack`
    );
    for (const pack of packs) {
      await this.createProfileAndLink(
        queryRunner,
        'innovation_pack',
        pack.id,
        pack.displayName,
        ''
      );
    }

    const projects: any[] = await queryRunner.query(
      `SELECT id, displayName, description, tagsetId from project`
    );
    for (const project of projects) {
      const profileID = await this.createProfileAndLink(
        queryRunner,
        'project',
        project.id,
        project.displayName,
        project.description
      );
      // Update the visuals to be parented on the new profile
      await queryRunner.query(
        `UPDATE tagset SET profileId = '${profileID}' WHERE (id = '${project.tagsetId}')`
      );
    }

    await this.replaceTemplateInfoProfile(queryRunner, 'canvas_template');
    await this.replaceTemplateInfoProfile(queryRunner, 'aspect_template');
    await this.replaceTemplateInfoProfile(queryRunner, 'lifecycle_template');

    /////////////////////////////////
    // Remove old data / structure
    await queryRunner.query('ALTER TABLE `callout` DROP COLUMN `displayName`');
    await queryRunner.query('ALTER TABLE `callout` DROP COLUMN `description`');

    await queryRunner.query('ALTER TABLE `canvas` DROP COLUMN `displayName`');

    await queryRunner.query(
      'ALTER TABLE `innovation_pack` DROP COLUMN `displayName`'
    );

    await queryRunner.query('ALTER TABLE `project` DROP COLUMN `displayName`');
    await queryRunner.query('ALTER TABLE `project` DROP COLUMN `description`');
    await queryRunner.query('ALTER TABLE `project` DROP COLUMN `tagsetId`');

    await queryRunner.query(
      'ALTER TABLE `canvas_template` DROP COLUMN `templateInfoId`'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect_template` DROP COLUMN `templateInfoId`'
    );
    await queryRunner.query(
      'ALTER TABLE `lifecycle_template` DROP COLUMN `templateInfoId`'
    );
    await queryRunner.query('DROP TABLE `template_info`');
  }

  ///////////////////////////////
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back in FKs that were removed
    await queryRunner.query(
      `ALTER TABLE \`canvas_template\` ADD CONSTRAINT \`FK_65557901817dd09d5906537e088\` FOREIGN KEY (\`templateInfoId\`) REFERENCES \`template_info\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect_template\` ADD CONSTRAINT \`FK_66667901817dd09d5906537e088\` FOREIGN KEY (\`templateInfoId\`) REFERENCES \`template_info\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`lifecycle_template\` ADD CONSTRAINT \`FK_76547901817dd09d5906537e088\` FOREIGN KEY (\`templateInfoId\`) REFERENCES \`template_info\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_d07535c59062f86e887de8f0a57` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`template_info\` ADD CONSTRAINT \`FK_77777901817dd09d5906537e088\` FOREIGN KEY (\`tagsetId\`) REFERENCES \`tagset\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template_info\` ADD CONSTRAINT \`FK_88888901817dd09d5906537e088\` FOREIGN KEY (\`visualId\`) REFERENCES \`visual\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD CONSTRAINT FK_c7b34f838919f526f829295cf86 FOREIGN KEY (previewId) REFERENCES visual(id) ON DELETE SET NULL;`
    );

    await this.removeProfileRelation(
      queryRunner,
      'FK_19991450cf75dc486700ca034c6',
      'callout'
    );
    await this.removeProfileRelation(
      queryRunner,
      'FK_29991450cf75dc486700ca034c6',
      'canvas'
    );
    await this.removeProfileRelation(
      queryRunner,
      'FK_39991450cf75dc486700ca034c6',
      'innovation_pack'
    );
    await this.removeProfileRelation(
      queryRunner,
      'FK_49991450cf75dc486700ca034c6',
      'project'
    );
    await this.removeProfileRelation(
      queryRunner,
      'FK_59991450cf75dc486700ca034c6',
      'aspect_template'
    );
    await this.removeProfileRelation(
      queryRunner,
      'FK_69991450cf75dc486700ca034c6',
      'canvas_template'
    );
    await this.removeProfileRelation(
      queryRunner,
      'FK_79991450cf75dc486700ca034c6',
      'lifecycle_template'
    );
  }

  public async addProfileRelation(
    queryRunner: QueryRunner,
    fk: string,
    entityTable: string
  ): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`${entityTable}\` ADD \`profileId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`${entityTable}\` ADD CONSTRAINT \`${fk}\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  private async createProfileAndLink(
    queryRunner: QueryRunner,
    entityTable: string,
    entityID: string,
    displayName: string,
    description: string
  ): Promise<string> {
    const newProfileID = randomUUID();
    const profileAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
        ('${profileAuthID}',
        1, '', '', 0, '')`
    );

    await queryRunner.query(
      `INSERT INTO profile (id, version, authorizationId, description, displayName)
            VALUES ('${newProfileID}',
                    '1',
                    '${profileAuthID}',
                    '${escapeString(description)}',
                    '${escapeString(displayName)}')`
    );

    await queryRunner.query(
      `UPDATE \`${entityTable}\` SET profileId = '${newProfileID}' WHERE (id = '${entityID}')`
    );
    return newProfileID;
  }

  private async replaceTemplateInfoProfile(
    queryRunner: QueryRunner,
    entityTable: string
  ): Promise<void> {
    const templates: any[] = await queryRunner.query(
      `SELECT id, templateInfoId from  \`${entityTable}\``
    );
    for (const template of templates) {
      const templateInfos: any[] = await queryRunner.query(
        `SELECT id, title, description, tagsetId, visualId from \`template_info\` WHERE (id = '${template.templateInfoId}')`
      );
      const templateInfo = templateInfos[0];
      const profileID = await this.createProfileAndLink(
        queryRunner,
        entityTable,
        template.id,
        templateInfo.title,
        templateInfo.description
      );
      // Update the visuals to be parented on the new profile
      await queryRunner.query(
        `UPDATE visual SET profileId = '${profileID}' WHERE (id = '${templateInfo.visualId}')`
      );
      await queryRunner.query(
        `UPDATE tagset SET profileId = '${profileID}' WHERE (id = '${templateInfo.tagsetId}')`
      );
    }
  }

  public async removeProfileRelation(
    queryRunner: QueryRunner,
    fk: string,
    entityTable: string
  ): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`${entityTable}\` DROP FOREIGN KEY \`${fk}\``
    );
    await queryRunner.query(
      `ALTER TABLE \`${entityTable}\` DROP COLUMN \`profileId\``
    );
  }
}

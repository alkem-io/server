import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { escapeString } from './utils/escape-string';

export class profiles1679337399999 implements MigrationInterface {
  name = 'profiles1679337399999';

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
    await queryRunner.query('ALTER TABLE `canvas` DROP COLUMN `previewId`');

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
    await queryRunner.query(
      `CREATE TABLE \`template_info\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
             \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
              \`version\` int NOT NULL, \`title\` varchar(128) NOT NULL, \`description\` text NOT NULL, \`tagsetId\` char(36) NULL, \`visualId\` char(36) NULL,
              PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );

    // Add back in the fields that were removed
    await queryRunner.query(
      'ALTER TABLE `callout` ADD `displayName` varchar(255) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `callout` ADD `description` text NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `canvas` ADD `displayName` varchar(255) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `canvas` ADD `previewId` char(36) NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `innovation_pack` ADD `displayName` varchar(255) NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `project` ADD `displayName` varchar(255) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD `description` text NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD `tagsetId` char(36) NULL'
    );

    await queryRunner.query(
      'ALTER TABLE `canvas_template` ADD COLUMN `templateInfoId` char(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect_template` ADD COLUMN `templateInfoId` char(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `lifecycle_template` ADD COLUMN `templateInfoId` char(36) NULL'
    );

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

    //////////////////////////////
    // Migrate the data
    const callouts: any[] = await queryRunner.query(
      `SELECT id, profileId from callout`
    );
    for (const callout of callouts) {
      const { profileId, displayName, description, authorizationId } =
        await this.getProfile(queryRunner, callout.profileId);

      await queryRunner.query(
        `UPDATE callout SET
        description = '${escapeString(description)}',
        displayName = '${escapeString(displayName)}'
        WHERE (id = '${callout.id}')`
      );

      await this.deleteProfile(queryRunner, profileId, authorizationId);
    }

    const canvases: any[] = await queryRunner.query(
      `SELECT id, profileId from canvas`
    );
    for (const canvas of canvases) {
      const { profileId, displayName, description, authorizationId } =
        await this.getProfile(queryRunner, canvas.profileId);
      const visualId = await this.getVisualIdForProfile(queryRunner, profileId);

      await queryRunner.query(
        `UPDATE canvas SET
        description = '${escapeString(description)}',
        displayName = '${escapeString(displayName)}',
        previewId = '${visualId}'
        WHERE (id = '${canvas.id}')`
      );
      await queryRunner.query(
        `UPDATE visual SET profileId = NULL WHERE (profileId = '${profileId}')`
      );
    }

    const packs: any[] = await queryRunner.query(
      `SELECT id, profileId from innovation_pack`
    );
    for (const pack of packs) {
      const { profileId, displayName, description, authorizationId } =
        await this.getProfile(queryRunner, pack.profileId);
      await queryRunner.query(
        `UPDATE innovation_pack SET
          displayName = '${escapeString(displayName)}'
          WHERE (id = '${pack.id}')`
      );
      await this.deleteProfile(queryRunner, profileId, authorizationId);
    }

    const projects: any[] = await queryRunner.query(
      `SELECT id, profileId from project`
    );
    for (const project of projects) {
      const { profileId, displayName, description, authorizationId } =
        await this.getProfile(queryRunner, project.profileId);
      const tagsetId = await this.getTagsetIdForProfile(queryRunner, profileId);

      await queryRunner.query(
        `UPDATE project SET
          description = '${escapeString(description)}',
          displayName = '${escapeString(displayName)}',
          tagsetId = '${tagsetId}'
          WHERE (id = '${project.id}')`
      );
      await queryRunner.query(
        `UPDATE tagset SET profileId = NULL WHERE (profileId = '${profileId}')`
      );

      await this.deleteProfile(queryRunner, profileId, authorizationId);
    }

    await this.replaceProfileTemplateInfo(queryRunner, 'canvas_template');
    await this.replaceProfileTemplateInfo(queryRunner, 'aspect_template');
    await this.replaceProfileTemplateInfo(queryRunner, 'lifecycle_template');

    ///////////////////////////

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
      `INSERT INTO profile (id, version, authorizationId, description, displayName, tagline)
            VALUES ('${newProfileID}',
                    '1',
                    '${profileAuthID}',
                    '${escapeString(description)}',
                    '${escapeString(displayName)}',
                    '')`
    );

    await queryRunner.query(
      `UPDATE \`${entityTable}\` SET profileId = '${newProfileID}' WHERE (id = '${entityID}')`
    );
    return newProfileID;
  }

  private async getProfile(
    queryRunner: QueryRunner,
    profileId: string
  ): Promise<{
    profileId: string;
    displayName: string;
    description: string;
    authorizationId: string;
  }> {
    const profiles: any[] = await queryRunner.query(
      `SELECT id, displayName, description, authorizationId from \`profile\` WHERE (id = '${profileId}')`
    );
    const profile = profiles[0];

    return {
      profileId: profile.id,
      displayName: profile.displayName,
      description: profile.description,
      authorizationId: profile.authorizationId,
    };
  }

  private async getVisualIdForProfile(
    queryRunner: QueryRunner,
    profileId: string
  ): Promise<string> {
    const visuals: any[] = await queryRunner.query(
      `SELECT id from \`visual\` WHERE (profileId = '${profileId}')`
    );
    const visual = visuals[0];
    return visual.id;
  }

  private async getTagsetIdForProfile(
    queryRunner: QueryRunner,
    profileId: string
  ): Promise<string> {
    const tagsets: any[] = await queryRunner.query(
      `SELECT id from \`tagset\` WHERE (profileId = '${profileId}')`
    );
    const tagset = tagsets[0];
    return tagset.id;
  }

  private async deleteProfile(
    queryRunner: QueryRunner,
    profileId: string,
    profileAuthId: string
  ): Promise<void> {
    await queryRunner.query(
      `DELETE FROM authorization_policy WHERE (id = '${profileAuthId}')`
    );
    await queryRunner.query(`DELETE FROM profile WHERE (id = '${profileId}')`);
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

  private async replaceProfileTemplateInfo(
    queryRunner: QueryRunner,
    entityTable: string
  ): Promise<void> {
    const templates: any[] = await queryRunner.query(
      `SELECT id, profileId from  \`${entityTable}\``
    );
    for (const template of templates) {
      const { profileId, displayName, description, authorizationId } =
        await this.getProfile(queryRunner, template.profileId);
      const tagsetId = await this.getTagsetIdForProfile(queryRunner, profileId);
      const visualId = await this.getVisualIdForProfile(queryRunner, profileId);

      const templateInfoID = randomUUID();

      await queryRunner.query(
        `INSERT INTO template_info (id, version, title, description, tagsetId, visualId)
            VALUES ('${templateInfoID}',
                    '1',
                    '${escapeString(displayName)}',
                    '${escapeString(description)}',
                    '${tagsetId}',
                    '${visualId}'
                    )`
      );

      await queryRunner.query(
        `UPDATE \`${entityTable}\` SET templateInfoId = '${templateInfoID}' WHERE (id = '${template.id}')`
      );

      // Update the visuals to be parented on the new profile
      await queryRunner.query(
        `UPDATE visual SET profileId = NULL WHERE (profileId = '${profileId}')`
      );
      await queryRunner.query(
        `UPDATE tagset SET profileId = NULL WHERE (profileId = '${profileId}')`
      );
      await this.deleteProfile(queryRunner, profileId, authorizationId);
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

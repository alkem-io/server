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

    /////////////////////////////////
    // Remove old data / structure
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

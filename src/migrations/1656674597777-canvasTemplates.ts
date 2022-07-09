import { MigrationInterface, QueryRunner } from 'typeorm';

export class canvasTemplates1656674597777 implements MigrationInterface {
  name = 'canvasTemplates1656674597777';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove the canvases that are for ecosystem models
    const ecosystems: any[] = await queryRunner.query(
      `SELECT id, canvasId from ecosystem_model`
    );
    for (const ecosystem of ecosystems) {
      await queryRunner.query(
        `DELETE FROM canvas WHERE (id = '${ecosystem.canvasId}')`
      );
    }

    // Rename existing Canvases that are marked as being Templates
    const canvases: any[] = await queryRunner.query(
      `SELECT id, contextId, value, displayName, isTemplate from canvas`
    );
    for (const canvas of canvases) {
      if (canvas.isTemplate) {
        await queryRunner.query(
          `UPDATE canvas SET displayName='template_${canvas.displayName}' WHERE id='${canvas.id}'`
        );
      }
    }
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP COLUMN \`isTemplate\``
    );

    // Remove the relationship between ecosystem model + canvas
    await queryRunner.query(
      'ALTER TABLE `ecosystem_model` DROP FOREIGN KEY `FK_c9ed67519d26140f98265a542e7`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_c9ed67519d26140f98265a542e` ON `ecosystem_model`'
    );
    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` DROP COLUMN \`canvasId\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const canvasTemplates: any[] = await queryRunner.query(
      `SELECT id from canvas_template`
    );
    for (const canvasTemplate of canvasTemplates) {
      await queryRunner.query(
        `DELETE FROM canvas_template WHERE id='${canvasTemplate.id}'`
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`isTemplate\` tinyint NOT NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` ADD \`canvasId\` char(36) NULL`
    );

    await queryRunner.query(
      'ALTER TABLE `ecosystem_model` ADD CONSTRAINT `FK_c9ed67519d26140f98265a542e7` FOREIGN KEY (`canvasId`) REFERENCES `canvas`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecosystem_model` ADD UNIQUE INDEX `IDX_c9ed67519d26140f98265a542e` (`canvasId`)'
    );
  }
}

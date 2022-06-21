import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { escapeString } from './utils/escape-string';

export class canvasTemplates1655830713614 implements MigrationInterface {
  name = 'canvasTemplates1655830713614';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migrate the existing Canvases that are marked as being Templates
    const canvases: any[] = await queryRunner.query(
      `SELECT id, contextId, value, name, isTemplate from canvas`
    );
    for (const canvas of canvases) {
      if (canvas.isTemplate) {
        const hubId = await this.getHubIDGivenContextId(
          queryRunner,
          canvas.contextId
        );
        console.log(
          `Identified that canvas that is a template that belongs in hub: ${hubId}`
        );
        const hubs: any[] = await queryRunner.query(
          `SELECT id, templatesSetId from hub WHERE hub.id = '${hubId}'`
        );
        const hub = hubs[0];

        // create the new aspect template objects from the existing data
        const canvasTemplateID = randomUUID();
        const canvasTemplateAuthID = randomUUID();
        const templateInfoID = randomUUID();
        const tagsetID = randomUUID();
        const tagsetAuthID = randomUUID();
        const visualID = randomUUID();
        const visualAuthID = randomUUID();
        await queryRunner.query(
          `INSERT INTO authorization_policy VALUES ('${tagsetAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
        );
        await queryRunner.query(
          `INSERT INTO authorization_policy VALUES ('${visualAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
        );
        await queryRunner.query(
          `INSERT INTO authorization_policy VALUES ('${canvasTemplateAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
        );
        await queryRunner.query(
          `INSERT INTO tagset (id, createdDate, updatedDate, version, name, tags, authorizationId)
          VALUES ('${tagsetID}', NOW(), NOW(), 1, 'default', '', '${tagsetAuthID}')`
        );
        await queryRunner.query(
          `INSERT INTO visual (id, createdDate, updatedDate, version, authorizationId, name, uri, minWidth, maxWidth, minHeight, maxHeight, aspectRatio, allowedTypes)
          VALUES ('${visualID}', NOW(), NOW(), 1, '${visualAuthID}', '${this.templateVisual.name}', '', '${this.templateVisual.minWidth}', '${this.templateVisual.maxWidth}', '${this.templateVisual.minHeight}', '${this.templateVisual.maxHeight}', '${this.templateVisual.aspectRatio}', '${this.allowedTypes}')`
        );
        await queryRunner.query(
          `INSERT INTO template_info (id, createdDate, updatedDate, version, title, description, tagsetId, visualId)
          VALUES ('${templateInfoID}', NOW(), NOW(), 1, '${
            canvas.name
          }', '${escapeString(canvas.name)}', '${tagsetID}', '${visualID}')`
        );
        await queryRunner.query(
          `INSERT INTO canvas_template (id, createdDate, updatedDate, version, authorizationId, templatesSetId, templateInfoId, value )
          VALUES ('${canvasTemplateID}', NOW(), NOW(), 1, '${canvasTemplateAuthID}', '${
            hub.templatesSetId
          }', '${templateInfoID}', '${escapeString(canvas.value)}' )`
        );
      }
    }
    //throw new Error(`testing`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    //todo: drop content of canvas template table + related auth IDs
  }

  public async getHubIDGivenContextId(
    queryRunner: QueryRunner,
    contextId: string
  ): Promise<string> {
    let hubId = '';
    const hubForContext: any[] = await queryRunner.query(
      `SELECT id from hub WHERE hub.contextId = '${contextId}'`
    );
    if (hubForContext.length > 0) {
      hubId = hubForContext[0].id;
    } else {
      const challengeForContext: any[] = await queryRunner.query(
        `SELECT id, hubID from challenge WHERE challenge.contextId = '${contextId}'`
      );
      if (challengeForContext.length > 0) {
        hubId = challengeForContext[0].hubID;
      } else {
        const opportunityForContext: any[] = await queryRunner.query(
          `SELECT id, hubID from opportunity WHERE opportunity.contextId = '${contextId}'`
        );
        if (opportunityForContext.length > 0) {
          hubId = opportunityForContext[0].hubID;
        } else {
          console.log(
            `Identified a canvas that is not part of any Hub: ${contextId}`
          );
        }
      }
    }
    return hubId;
  }

  allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
  templateVisual = {
    name: 'bannerNarrow',
    minWidth: 384,
    maxWidth: 768,
    minHeight: 128,
    maxHeight: 256,
    aspectRatio: 3,
  };
}

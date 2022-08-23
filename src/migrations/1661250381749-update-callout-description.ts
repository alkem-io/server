import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateCalloutDescription1661250381749
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`alkemio\`.\`callout\` SET \`description\` = 'Collaborate visually using Canvases. Create a new Canvas from a template, or explore Canvases already created.', \`displayName\` = 'Collaborate visually' WHERE \`nameID\` LIKE '%othercanvases-%';`
    );
    await queryRunner.query(
      `UPDATE \`alkemio\`.\`callout\` SET \`description\` = 'Contribute your insights to understanding the context. It is about surfacing up the wisdom of the community. Add your own card, or comment on aspects added by others.', \`displayName\` = 'Contribute' WHERE \`nameID\` LIKE '%othercards-%';`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`alkemio\`.\`callout\` SET \`description\` = 'This callout contains all canvases created before the callout feature was released', \`displayName\` = 'Other canvases' WHERE \`nameID\` LIKE '%othercanvases-%';`
    );
    await queryRunner.query(
      `UPDATE \`alkemio\`.\`callout\` SET \`description\` = 'This callout contains all cards created before the callout feature was released', \`displayName\` = 'Other cards' WHERE \`nameID\` LIKE '%othercards-%';`
    );
  }
}

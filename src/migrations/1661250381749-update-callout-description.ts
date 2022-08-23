import {MigrationInterface, QueryRunner} from "typeorm";

export class updateCalloutDescription1661250381749 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(
        `UPDATE \`alkemio\`.\`callout\` SET \`description\` = 'FILL IN', \`displayName\` = 'FILL IN' WHERE \`nameID\` LIKE '%othercanvases-%';`
      );
      await queryRunner.query(
        `UPDATE \`alkemio\`.\`callout\` SET \`description\` = 'FILL IN', \`displayName\` = 'FILL IN' WHERE \`nameID\` LIKE '%othercards-%';`
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

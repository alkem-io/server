import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanUpContributions1758116200183 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD \`type\` varchar(128) NOT NULL DEFAULT 'post'`
    );

    await queryRunner.query(
      `UPDATE \`callout_contribution\` SET \`type\` = 'post' WHERE \`postId\` IS NOT NULL`
    );
    await queryRunner.query(
      `UPDATE \`callout_contribution\` SET \`type\` = 'link' WHERE \`linkId\` IS NOT NULL`
    );
    await queryRunner.query(
      `UPDATE \`callout_contribution\` SET \`type\` = 'whiteboard' WHERE \`whiteboardId\` IS NOT NULL`
    );
    await queryRunner.query(
      `UPDATE \`callout_contribution\` SET \`type\` = 'memo' WHERE \`memoId\` IS NOT NULL`
    );
    await queryRunner.query(
      `DELETE FROM \`callout_contribution\` WHERE \`whiteboardId\` IS NULL AND \`postId\` IS NULL AND \`linkId\` IS NULL AND \`whiteboardId\` IS NULL`
    );

    const problems = [
      ...(await queryRunner.query(
        `SELECT id FROM \`callout_contribution\` WHERE \`postId\` IS NOT NULL AND \`type\` != 'post'`
      )),
      ...(await queryRunner.query(
        `SELECT id FROM \`callout_contribution\` WHERE \`linkId\` IS NOT NULL AND \`type\` != 'link'`
      )),
      ...(await queryRunner.query(
        `SELECT id FROM \`callout_contribution\` WHERE \`whiteboardId\` IS NOT NULL AND \`type\` != 'whiteboard'`
      )),
      ...(await queryRunner.query(
        `SELECT id FROM \`callout_contribution\` WHERE \`memoId\` IS NOT NULL AND \`type\` != 'memo'`
      )),
    ];
    if (problems.length) {
      console.log('Contributions with multiple types: ', problems);
      throw new Error('Contributions with multiple types found, see log');
    } else {
      console.log('no problems found');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP COLUMN \`type\``
    );
  }
}

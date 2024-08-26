import { MigrationInterface, QueryRunner } from 'typeorm';

export class ContributionSortOrder1724319295054 implements MigrationInterface {
  name = 'ContributionSortOrder1724319295054';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD \`sortOrder\` int NOT NULL DEFAULT (0)`
    );
    // Add a default sort order to all existing contributions:
    const contributions: {
      id: string;
      calloutId: string;
    }[] = await queryRunner.query(
      `SELECT \`id\`, \`calloutId\` FROM \`callout_contribution\` ORDER BY \`calloutId\``
    );

    let lastCalloutId = '';
    let sortOrder = 1;
    for (const { id, calloutId } of contributions) {
      if (lastCalloutId !== calloutId) {
        sortOrder = 1;
        lastCalloutId = calloutId;
      } else {
        sortOrder++;
      }
      await queryRunner.query(
        `UPDATE \`callout_contribution\` SET \`sortOrder\` = ${sortOrder} WHERE \`id\` = '${id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP COLUMN \`sortOrder\``
    );
  }
}

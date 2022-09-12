import { MigrationInterface, QueryRunner } from 'typeorm';

export class calloutOrder1662878852718 implements MigrationInterface {
  name = 'calloutOrder1662878852718';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`sortOrder\` int NOT NULL`
    );
    const callouts: any[] = await queryRunner.query(`SELECT id from callout`);
    for (const callout of callouts) {
      await queryRunner.query(
        `UPDATE \`callout\` SET \`sortOrder\` = '10' WHERE \`id\`= '${callout.id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`sortOrder\` `
    );
  }
}

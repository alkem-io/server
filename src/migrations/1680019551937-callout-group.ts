import { CalloutGroup } from '@common/enums/callout.group';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class calloutGroup1680019551937 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`group\` text NOT NULL`
    );
    const callouts: { id: string }[] = await queryRunner.query(
      `SELECT id from callout`
    );
    for (const callout of callouts) {
      await queryRunner.query(
        `UPDATE \`callout\` SET \`group\` = '${CalloutGroup.KNOWLEDGE_GROUP_2}' WHERE \`id\`= '${callout.id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`callout\` DROP COLUMN \`group\``);
  }
}

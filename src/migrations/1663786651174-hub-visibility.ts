import { MigrationInterface, QueryRunner } from 'typeorm';

export class hubVisibility1663786651174 implements MigrationInterface {
  name = 'hubVisibility1663786651174';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`visibility\` varchar(255) NULL`
    );
    const hubs: any[] = await queryRunner.query(`SELECT id from hub`);
    for (const hub of hubs) {
      await queryRunner.query(
        `UPDATE \`hub\` SET \`visibility\` = 'active' WHERE \`id\`= '${hub.id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`hub\` DROP COLUMN \`visibility\``);
  }
}

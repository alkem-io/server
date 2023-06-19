import { MigrationInterface, QueryRunner } from 'typeorm';

export class hxbVisibility1663786651174 implements MigrationInterface {
  name = 'hxbVisibility1663786651174';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`hxb\` ADD \`visibility\` varchar(255) NULL`
    );
    const hxbs: any[] = await queryRunner.query(`SELECT id from hxb`);
    for (const hxb of hxbs) {
      await queryRunner.query(
        `UPDATE \`hxb\` SET \`visibility\` = 'active' WHERE \`id\`= '${hxb.id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`hxb\` DROP COLUMN \`visibility\``);
  }
}

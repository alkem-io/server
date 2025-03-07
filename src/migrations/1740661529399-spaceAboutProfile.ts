import { MigrationInterface, QueryRunner } from 'typeorm';

export class SpaceAboutProfile1740661529399 implements MigrationInterface {
  name = 'SpaceAboutProfile1740661529399';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`profile\` SET type = 'space-about' WHERE type = 'space'`
    );
    await queryRunner.query(
      `UPDATE \`profile\` SET type = 'space-about' WHERE type = 'challenge'`
    );
    await queryRunner.query(
      `UPDATE \`profile\` SET type = 'space-about' WHERE type = 'opportunity'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

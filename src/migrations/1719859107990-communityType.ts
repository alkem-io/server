import { MigrationInterface, QueryRunner } from 'typeorm';

export class communityType1719859107990 implements MigrationInterface {
  name = 'communityType1719859107990';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`community\` DROP COLUMN \`type\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

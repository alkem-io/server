import { MigrationInterface, QueryRunner } from 'typeorm';

export class activityParent1663773266545 implements MigrationInterface {
  name = 'activityParent1663773266545';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`activity\` ADD \`parentID\` varchar(36) NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`activity\` DROP COLUMN \`parentID\``
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class TempStorage1725975786491 implements MigrationInterface {
  name = 'TempStorage1725975786491';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD \`temporaryLocation\` tinyint NOT NULL`
    );
    // TODO set the default to be false
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP COLUMN \`temporaryLocation\``
    );
  }
}

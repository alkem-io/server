import { MigrationInterface, QueryRunner } from 'typeorm';

export class serviceAccount1634103839440 implements MigrationInterface {
  name = 'serviceAccount1634103839440';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`serviceProfile\` tinyint NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP COLUMN \`serviceProfile\``
    );
  }
}

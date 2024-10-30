import { MigrationInterface, QueryRunner } from 'typeorm';

export class Xstate51729361588097 implements MigrationInterface {
  name = 'Xstate51729361588097';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`lifecycle\` DROP COLUMN \`machineDef\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`lifecycle\` ADD \`machineDef\` text NULL`
    );
  }
}

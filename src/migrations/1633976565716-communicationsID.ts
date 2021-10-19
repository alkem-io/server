import { MigrationInterface, QueryRunner } from 'typeorm';

export class communicationID1633976565716 implements MigrationInterface {
  name = 'communicationID1633976565716';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`communicationID\` varchar(255) NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP COLUMN \`communicationID\``
    );
  }
}

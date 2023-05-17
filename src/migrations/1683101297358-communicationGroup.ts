import { MigrationInterface, QueryRunner } from 'typeorm';

export class communicationGroup1683101297358 implements MigrationInterface {
  name = 'communicationGroup1683101297358';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP COLUMN \`communicationGroupID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`updates\` DROP COLUMN \`communicationGroupID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP COLUMN \`communicationGroupID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`comments\` DROP COLUMN \`communicationGroupID\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`comments\` ADD \`communicationGroupID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD \`communicationGroupID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`updates\` ADD \`communicationGroupID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD \`communicationGroupID\` varchar(255) NOT NULL`
    );
  }
}

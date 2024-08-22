import { MigrationInterface, QueryRunner } from 'typeorm';

export class ContributionSortOrder1724319295054 implements MigrationInterface {
  name = 'ContributionSortOrder1724319295054';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD \`sortOrder\` int NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP COLUMN \`sortOrder\``
    );
  }
}

// TODO: sort existing by last activity

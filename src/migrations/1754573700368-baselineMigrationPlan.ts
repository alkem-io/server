import { MigrationInterface, QueryRunner } from 'typeorm';

const exampleBaselineLicensePlan = {
  spaceFree: 1,
  spacePlus: 0,
  spacePremium: 0,
  virtualContributor: 0,
  innovationPacks: 0,
  startingPages: 0,
};

export class BaselineLicensePlan1754573700368 implements MigrationInterface {
  name = 'BaselineLicensePlan1754573700368';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const defaultBaselinePlan = JSON.stringify(exampleBaselineLicensePlan);

    // Step 1: Add the column as nullable first
    await queryRunner.query(
      'ALTER TABLE `account` ADD `baselineLicensePlan` json NULL'
    );

    // Step 2: Update all existing accounts with the default baseline plan
    await queryRunner.query(
      `UPDATE \`account\` SET \`baselineLicensePlan\` = '${defaultBaselinePlan}' WHERE \`baselineLicensePlan\` IS NULL`
    );

    // Step 3: Make the column NOT NULL
    await queryRunner.query(
      'ALTER TABLE `account` MODIFY COLUMN `baselineLicensePlan` json NOT NULL'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `account` DROP COLUMN `baselineLicensePlan`'
    );
  }
}

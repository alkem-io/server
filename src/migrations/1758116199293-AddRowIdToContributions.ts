import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRowIdToContributions1758116199293
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`callout_contribution\`
      ADD \`rowId\` INT NOT NULL AUTO_INCREMENT,
      ADD UNIQUE INDEX \`IDX_580861d7a59cbf3cec57cdb62a\` (\`rowId\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP INDEX \`IDX_580861d7a59cbf3cec57cdb62a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP COLUMN \`rowId\``
    );
  }
}

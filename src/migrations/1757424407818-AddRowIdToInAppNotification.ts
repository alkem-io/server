import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRowIdToInAppNotification1757424407818
  implements MigrationInterface
{
  name = 'AddRowIdToInAppNotification1757424407818';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          ALTER TABLE \`in_app_notification\`
          ADD \`rowId\` INT NOT NULL AUTO_INCREMENT,
          ADD UNIQUE INDEX \`IDX_4c6428607b038a5b96509f8c2e\` (\`rowId\`)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`in_app_notification\` DROP INDEX \`IDX_4c6428607b038a5b96509f8c2e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`in_app_notification\` DROP COLUMN \`rowId\``
    );
  }
}

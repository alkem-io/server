import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixBaseline1740661529396 implements MigrationInterface {
  name = 'FixBaseline1740661529396';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_c59c1beb254808dd32007de661\` ON \`space\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_c59c1beb254808dd32007de661\` ON \`space\` (\`aboutId\`)`
    );
  }
}

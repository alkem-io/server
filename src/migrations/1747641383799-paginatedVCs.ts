import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaginatedVCs1747641383799 implements MigrationInterface {
  name = 'PaginatedVCs1747641383799';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`virtual_contributor\`
      ADD \`rowId\` INT NOT NULL AUTO_INCREMENT,
      ADD UNIQUE INDEX \`IDX_a643bc875218dd4abbf86bbf7f\` (\`rowId\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP INDEX \`IDX_a643bc875218dd4abbf86bbf7f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP COLUMN \`rowId\``
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class applicationSort1633155784833 implements MigrationInterface {
  name = 'applicationSort1633155784833';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`nvp\` ADD \`sortOrder\` int NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE .\`nvp\` DROP COLUMN \`sortOrder\``);
  }
}

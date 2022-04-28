import { MigrationInterface, QueryRunner } from 'typeorm';

export class usersSequentialIdColumn1651053294552
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE \`user\` ADD \`rowId\` int NOT NULL AUTO_INCREMENT FIRST,
        ADD UNIQUE INDEX \`IDX_266bc44a18601f893566962df6\` (\`rowId\`)
    `);
    await queryRunner.query(`
        ALTER TABLE \`organization\` ADD \`rowId\` int NOT NULL AUTO_INCREMENT FIRST,
        ADD UNIQUE INDEX \`IDX_266bc44a18601f893566962df7\` (\`rowId\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`rowId\``);
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP COLUMN \`rowId\``
    );
  }
}

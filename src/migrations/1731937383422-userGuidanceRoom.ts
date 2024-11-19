import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserGuidanceRoom1731937383422 implements MigrationInterface {
  name = 'UserGuidanceRoom1731937383422';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`guidanceRoomId\` char(36) NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_67c9d8c51a7033bbe9355f7609\` ON \`user\` (\`guidanceRoomId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_67c9d8c51a7033bbe9355f76095\` FOREIGN KEY (\`guidanceRoomId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_67c9d8c51a7033bbe9355f76095\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_67c9d8c51a7033bbe9355f7609\` ON \`user\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP COLUMN \`guidanceRoomId\``
    );
  }
}

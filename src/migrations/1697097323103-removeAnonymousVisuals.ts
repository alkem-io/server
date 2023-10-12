import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeAnonymousVisuals1697097323103 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP COLUMN \`anonymousReadAccess\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD \`anonymousReadAccess\` tinyint NULL`
    );
  }
}

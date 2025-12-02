import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSsi1764337568772 implements MigrationInterface {
  name = 'RemoveSsi1764337568772';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`authorization_policy\` DROP COLUMN \`verifiedCredentialRules\``
    );
    await queryRunner.query(`ALTER TABLE \`agent\` DROP COLUMN \`did\``);
    await queryRunner.query(`ALTER TABLE \`agent\` DROP COLUMN \`password\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`agent\` ADD \`password\` varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` ADD \`did\` varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`authorization_policy\` ADD \`verifiedCredentialRules\` json NOT NULL`
    );
  }
}

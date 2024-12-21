import { MigrationInterface, QueryRunner } from 'typeorm';

export class CredentialRules1734708463444 implements MigrationInterface {
  name = 'CredentialRules1734708463444';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Clean up existing data
    await queryRunner.query(
      "UPDATE `authorization_policy` SET `credentialRules` = '[]' WHERE `credentialRules` IS NULL OR `credentialRules` = ''"
    );
    await queryRunner.query(
      "UPDATE `authorization_policy` SET `verifiedCredentialRules` = '[]' WHERE `verifiedCredentialRules` IS NULL OR `verifiedCredentialRules` = ''"
    );
    await queryRunner.query(
      "UPDATE `authorization_policy` SET `privilegeRules` = '[]' WHERE `privilegeRules` IS NULL OR `privilegeRules` = ''"
    );
    await queryRunner.query(
      'ALTER TABLE `authorization_policy` MODIFY COLUMN `credentialRules` json null'
    );
    await queryRunner.query(
      'ALTER TABLE `authorization_policy` MODIFY COLUMN `verifiedCredentialRules` json null'
    );
    await queryRunner.query(
      'ALTER TABLE `authorization_policy` MODIFY COLUMN `privilegeRules` json null'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `authorization_policy` MODIFY COLUMN `credentialRules` text'
    );
    await queryRunner.query(
      'ALTER TABLE `authorization_policy` MODIFY COLUMN `verifiedCredentialRules` text'
    );
    await queryRunner.query(
      'ALTER TABLE `authorization_policy` MODIFY COLUMN `privilegeRules` text'
    );
  }
}

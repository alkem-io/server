import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixBaseline1735810576923 implements MigrationInterface {
  name = 'FixBaseline1735810576923';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `IDX_9e1ebbc0972fa354d33b67a1a0` ON `collaboration`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_409cc6ee5429588f868cd59a1d` ON `virtual_contributor`'
    );
    await queryRunner.query(
      'ALTER TABLE `authorization_policy` CHANGE `credentialRules` `credentialRules` json NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `authorization_policy` CHANGE `privilegeRules` `privilegeRules` json NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `authorization_policy` CHANGE `verifiedCredentialRules` `verifiedCredentialRules` json NOT NULL'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `authorization_policy` CHANGE `verifiedCredentialRules` `verifiedCredentialRules` json NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `authorization_policy` CHANGE `privilegeRules` `privilegeRules` json NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `authorization_policy` CHANGE `credentialRules` `credentialRules` json NULL'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_409cc6ee5429588f868cd59a1d` ON `virtual_contributor` (`knowledgeBaseId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_9e1ebbc0972fa354d33b67a1a0` ON `collaboration` (`calloutsSetId`)'
    );
  }
}

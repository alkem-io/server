import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthParent1731781160588 implements MigrationInterface {
  name = 'AuthParent1731781160588';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`authorization_policy\` ADD \`parentAuthorizationPolicyId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`authorization_policy\` ADD CONSTRAINT \`FK_24b8950effd9ba78caa48ba76df\` FOREIGN KEY (\`parentAuthorizationPolicyId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`authorization_policy\` DROP FOREIGN KEY \`FK_24b8950effd9ba78caa48ba76df\``
    );
    await queryRunner.query(
      `ALTER TABLE \`authorization_policy\` DROP COLUMN \`parentAuthorizationPolicyId\``
    );
  }
}

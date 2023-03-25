import { MigrationInterface, QueryRunner } from 'typeorm';
import { escapeString } from './utils/escape-string';

export class authCascade1679729002173 implements MigrationInterface {
  name = 'authCascade1679729002173';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const authorizations: any[] = await queryRunner.query(
      `SELECT id, credentialRules, verifiedCredentialRules from authorization_policy`
    );
    for (const authorization of authorizations) {
      const updatedCredentialRules = authorization.credentialRules.replaceAll(
        'inheritable',
        'cascade'
      );
      const updatedVerifiedCredentialRules =
        authorization.verifiedCredentialRules.replaceAll(
          'inheritable',
          'cascade'
        );
      await queryRunner.query(
        `UPDATE authorization_policy SET credentialRules = '${escapeString(
          updatedCredentialRules
        )}', verifiedCredentialRules = '${escapeString(
          updatedVerifiedCredentialRules
        )}' WHERE (id = '${authorization.id}')`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const authorizations: any[] = await queryRunner.query(
      `SELECT id, credentialRules, verifiedCredentialRules from authorization_policy`
    );
    for (const authorization of authorizations) {
      const updatedCredentialRules = authorization.credentialRules.replaceAll(
        'cascade',
        'inheritable'
      );
      const updatedVerifiedCredentialRules =
        authorization.verifiedCredentialRules.replaceAll(
          'cascade',
          'inheritable'
        );
      await queryRunner.query(
        `UPDATE authorization_policy SET credentialRules = '${escapeString(
          updatedCredentialRules
        )}', verifiedCredentialRules = '${escapeString(
          updatedVerifiedCredentialRules
        )}' WHERE (id = '${authorization.id}')`
      );
    }
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class RefAuths1748628720167 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // find all references that do not have an authorization and then create one
    const referencesWithoutAuthorization = await queryRunner.query(`
        SELECT id FROM reference
        WHERE authorizationId IS NULL
      `);
    for (const reference of referencesWithoutAuthorization) {
      const authId = await this.createAuthorizationPolicy(
        queryRunner,
        'reference'
      );
      await queryRunner.query(
        `UPDATE reference SET authorizationId = $1 WHERE id = $2`,
        [authId, reference.id]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async createAuthorizationPolicy(
    queryRunner: QueryRunner,
    policyType: string
  ): Promise<string> {
    const authID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, privilegeRules, type) VALUES
                              ('${authID}',
                              1, '[]', '[]', '[]', '${policyType}')`
    );
    return authID;
  }
}

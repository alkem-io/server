import { MigrationInterface, QueryRunner } from 'typeorm';

export class credentials1667933499673 implements MigrationInterface {
  name = 'credentials1667933499673';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const authorizations: any[] = await queryRunner.query(
      `SELECT id, credentialRules FROM authorization_policy`
    );
    for (const authorization of authorizations) {
      if (!authorization.credentialRules) {
        //console.log(`No credential rules found for policy with id: ${authorization.id}`);
        continue;
      }
      const rules: oldCredentialRule[] = JSON.parse(
        authorization.credentialRules
      );
      const newRules: newCredentialRule[] = [];
      for (const rule of rules) {
        const newRule: newCredentialRule = {
          inherited: rule.inherited,
          grantedPrivileges: rule.grantedPrivileges,
          criterias: [
            {
              type: rule.type,
              resourceID: rule.resourceID,
            },
          ],
        };
        newRules.push(newRule);
      }
      await queryRunner.query(
        `UPDATE authorization_policy SET credentialRules = '${JSON.stringify(
          newRules
        )}' WHERE (id = '${authorization.id}')`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const authorizations: any[] = await queryRunner.query(
      `SELECT id, credentialRules FROM authorization_policy`
    );
    for (const authorization of authorizations) {
      if (!authorization.credentialRules) {
        continue;
      }
      const rules: newCredentialRule[] = JSON.parse(
        authorization.credentialRules
      );
      const oldRules: oldCredentialRule[] = [];
      for (const rule of rules) {
        const criteria = rule.criterias[0];
        const oldRule: oldCredentialRule = {
          inherited: rule.inherited,
          grantedPrivileges: rule.grantedPrivileges,
          type: criteria.type,
          resourceID: criteria.resourceID,
        };
        oldRules.push(oldRule);
      }
      await queryRunner.query(
        `UPDATE authorization_policy SET credentialRules = '${JSON.stringify(
          oldRules
        )}' WHERE (id = '${authorization.id}')`
      );
    }
  }
}

type oldCredentialRule = {
  inherited: boolean;
  grantedPrivileges: string[];
  type: string;
  resourceID: string;
};

type newCredentialRule = {
  inherited: boolean;
  grantedPrivileges: string[];
  criterias: {
    type: string;
    resourceID: string;
  }[];
};

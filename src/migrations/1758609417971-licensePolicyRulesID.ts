import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

interface GrantedEntitlement {
  type: string;
  limit: number;
}

interface LicensePolicyRuleOld {
  name: string;
  credentialType: string;
  grantedEntitlements: GrantedEntitlement[];
}

interface LicensePolicyRuleNew {
  id: string;
  name: string;
  credentialType: string;
  grantedEntitlements: GrantedEntitlement[];
}

export class LicensePolicyRulesID1758609417971 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Load in the credential rules from the license policy
    // and add in a UUID to each rule
    const [licensePolicy]: {
      id: string;
      credentialRules: LicensePolicyRuleOld[];
    }[] = await queryRunner.query(
      `SELECT id, credentialRules FROM license_policy`
    );

    const rules: LicensePolicyRuleOld[] = licensePolicy.credentialRules;
    const newRules: LicensePolicyRuleNew[] = rules.map(rule => ({
      id: randomUUID(),
      name: rule.name,
      credentialType: rule.credentialType,
      grantedEntitlements: rule.grantedEntitlements,
    }));

    await queryRunner.query(
      `UPDATE license_policy SET credentialRules = ? WHERE id = ?`,
      [JSON.stringify(newRules), licensePolicy.id]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

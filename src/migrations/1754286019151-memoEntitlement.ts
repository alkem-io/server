import { MigrationInterface, QueryRunner } from 'typeorm';

export class MemoEntitlement1754286019151 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename + migrate type of credential rules str to be json on licence_policy
    await queryRunner.query(
      'ALTER TABLE `license_policy` CHANGE `credentialRulesStr` `credentialRules` json NOT NULL'
    );

    // a) add an entitlement to all Collaboration + Space Licenses for Memo entitlement
    // get all licenses with type Collaboration or Space
    const licenses: { id: string; type: string }[] = await queryRunner.query(`
      SELECT id, type FROM license WHERE type IN ('Collaboration', 'Space')
    `);

    for (const license of licenses) {
      // get the entitlements for the license
      const entitlements: { id: string; type: string }[] =
        await queryRunner.query(
          `SELECT id, type FROM license_entitlement WHERE licenseId = ?`,
          [license.id]
        );

      // check if Memo entitlement exists
      const memoEntitlement = entitlements.find(e => e.type === 'Memo');
      if (!memoEntitlement) {
        // create a new Memo entitlement
        await queryRunner.query(
          `INSERT INTO license_entitlement (licenseId, type) VALUES (?, 'Memo')`,
          [license.id]
        );
      }
    }

    // b) add an entry to the license_policy definition file to assign entitlement if have corresponding credential
    // get the single license policy
    const licensePolicies: { id: string; credentialRules: string }[] =
      await queryRunner.query(`
      SELECT id, credentialRules FROM license_policy
    `);

    if (licensePolicies.length === 0) {
      console.error('No license policy found.');
      return;
    }

    const license_policy = licensePolicies[0];
    try {
      const credentialRules: LicensingCredentialBasedPolicyCredentialRule[] =
        JSON.parse(licensePolicies[0].credentialRules);
      // Check if the Memo entitlement is already present
      const memoRuleExists = credentialRules.some(
        rule => rule.credentialType === 'space-feature-memo-multi-user'
      );

      if (!memoRuleExists) {
        // Add the new rule for Memo entitlement
        credentialRules.push({
          credentialType: 'space-feature-memo-multi-user',
          grantedEntitlements: [
            {
              type: 'space-flag-whiteboard-multi-user',
              limit: 1,
            },
          ],
          name: 'Space Multi-User memo',
        });
      }
      // Update the license policy with the new credential rules
      await queryRunner.query(
        `UPDATE license_policy SET credentialRules = ? WHERE id = ?`,
        [JSON.stringify(credentialRules), license_policy.id]
      );
    } catch (error) {
      console.error('Failed to parse credential rules:', error);
      return;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

// License rules type
interface LicensingCredentialBasedPolicyCredentialRule {
  credentialType: string;
  grantedEntitlements: {
    type: string;
    limit: number;
  }[];
  name: string;
}

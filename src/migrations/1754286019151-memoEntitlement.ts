import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

const newMemoMultiUserCredential: LicensingCredentialBasedPolicyCredentialRule =
  {
    credentialType: 'space-feature-memo-multi-user',
    grantedEntitlements: [
      {
        type: 'space-flag-memo-multi-user',
        limit: 1,
      },
    ],
    name: 'Space Multi-User memo',
  } as const;

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
      const memoEntitlement = entitlements.find(
        e => e.type === 'space-flag-memo-multi-user'
      );
      if (!memoEntitlement) {
        // create a new Memo entitlement
        await queryRunner.query(
          `INSERT INTO license_entitlement (id, version, type, dataType, \`limit\`, enabled, licenseId) VALUES (?, ?, 'space-flag-memo-multi-user', 'flag', ?, ?, ?)`,
          [randomUUID(), 1, 1, 1, license.id]
        );
      }
    }

    // b) add an entry to the license_policy definition file to assign entitlement if have corresponding credential
    // get the single license policy
    const licensePolicies: {
      id: string;
      credentialRules: LicensingCredentialBasedPolicyCredentialRule[];
    }[] = await queryRunner.query(`
      SELECT id, credentialRules FROM license_policy
    `);

    if (licensePolicies.length === 0) {
      console.error('No license policy found.');
      return;
    }

    const license_policy = licensePolicies[0];
    const credentialRules = license_policy.credentialRules;
    // Check if the Memo entitlement is already present
    const memoRuleExists = credentialRules.some(
      rule => rule.credentialType === 'space-feature-memo-multi-user'
    );

    if (!memoRuleExists) {
      const indexToInsert = credentialRules.findIndex(
        rule => rule.credentialType === 'space-feature-whiteboard-multi-user'
      );

      if (indexToInsert > -1) {
        // Insert the new rule after the whiteboard multi-user rule
        credentialRules.splice(
          indexToInsert + 1,
          0,
          newMemoMultiUserCredential
        );
      } else {
        // If the whiteboard multi-user rule is not found, add the new rule at the end
        credentialRules.push(newMemoMultiUserCredential);
      }
      // Update the license policy with the new credential rules
      await queryRunner.query(
        `UPDATE license_policy SET credentialRules = ? WHERE id = ?`,
        [JSON.stringify(credentialRules), license_policy.id]
      );
    }

    // Finally add in a new license plan entry so it is there for all environments
    const licenseFrameworks: { id: string }[] = await queryRunner.query(`
      SELECT id FROM licensing_framework
    `);

    if (licenseFrameworks.length === 0) {
      console.error('No license framework found.');
      return;
    }
    const licenseFrameworkID = licenseFrameworks[0].id;
    const licensePlanID = randomUUID();
    await queryRunner.query(
      `INSERT INTO license_plan (id,
                                createdDate,
                                updatedDate,
                                version,
                                name,
                                enabled,
                                sortOrder,
                                pricePerMonth,
                                isFree,
                                trialEnabled,
                                requiresPaymentMethod,
                                requiresContactSupport,
                                licenseCredential,
                                type,
                                assignToNewOrganizationAccounts,
                                assignToNewUserAccounts,
                                licensingFrameworkId)
                  VALUES (?, NOW(6), NOW(6), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        licensePlanID,
        1,
        'SPACE_FEATURE_MEMO_MULTI_USER',
        1,
        55, // after whiteboard multi-user
        0.0,
        1,
        0,
        0,
        0,
        'space-feature-memo-multi-user',
        'space-feature-flag',
        0,
        0,
        licenseFrameworkID,
      ]
    );
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

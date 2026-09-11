import { randomUUID } from 'node:crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

// Self-contained enum copies — the migration must not import from
// src/common/enums so future enum edits never change history.
enum LicensingCredentialBasedCredentialType {
  SPACE_FEATURE_MEMO_SIGNING = 'space-feature-memo-signing',
}

enum LicenseEntitlementType {
  SPACE_FLAG_MEMO_SIGNING = 'space-flag-memo-signing',
}

const CREDENTIAL_TYPE =
  LicensingCredentialBasedCredentialType.SPACE_FEATURE_MEMO_SIGNING;
const ENTITLEMENT_TYPE = LicenseEntitlementType.SPACE_FLAG_MEMO_SIGNING;
const LICENSE_PLAN_NAME = 'SPACE_FEATURE_MEMO_SIGNING';
const LICENSE_PLAN_SORT_ORDER = 110;
const CREDENTIAL_RULE_NAME = 'Space Memo Signing';

export class AddMemoSigningEntitlement1788947200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotent INSERT into license_plan.
    const existingPlan = await queryRunner.query(
      `SELECT id FROM license_plan WHERE name = $1`,
      [LICENSE_PLAN_NAME]
    );

    if (existingPlan.length === 0) {
      const frameworkResult = await queryRunner.query(
        `SELECT id FROM licensing_framework LIMIT 1`
      );
      if (frameworkResult.length === 0) {
        throw new Error(
          'No licensing_framework row found; cannot insert license_plan'
        );
      }
      const licensingFrameworkId = frameworkResult[0].id;

      await queryRunner.query(
        `INSERT INTO license_plan (
           id, "createdDate", "updatedDate", version,
           name, enabled, "sortOrder", "pricePerMonth",
           "isFree", "trialEnabled", "requiresPaymentMethod",
           "requiresContactSupport", "licenseCredential", type,
           "assignToNewOrganizationAccounts", "assignToNewUserAccounts",
           "licensingFrameworkId"
         )
         VALUES (
           $1, NOW(), NOW(), 1,
           $2, true, $3, 0,
           true, false, false,
           true, $4, 'space-feature-flag',
           false, false,
           $5
         )`,
        [
          randomUUID(),
          LICENSE_PLAN_NAME,
          LICENSE_PLAN_SORT_ORDER,
          CREDENTIAL_TYPE,
          licensingFrameworkId,
        ]
      );
    }

    // Idempotent append to license_policy.credentialRules.
    const policyRows = await queryRunner.query(
      `SELECT id, "credentialRules" FROM license_policy`
    );
    for (const row of policyRows) {
      const rules: Array<{ credentialType?: string }> = Array.isArray(
        row.credentialRules
      )
        ? row.credentialRules
        : [];
      if (rules.some(rule => rule?.credentialType === CREDENTIAL_TYPE))
        continue;

      const newRule = {
        id: randomUUID(),
        credentialType: CREDENTIAL_TYPE,
        grantedEntitlements: [{ type: ENTITLEMENT_TYPE, limit: 1 }],
        name: CREDENTIAL_RULE_NAME,
      };

      await queryRunner.query(
        `UPDATE license_policy
         SET "credentialRules" = COALESCE("credentialRules", '[]'::jsonb) || $1::jsonb
         WHERE id = $2`,
        [JSON.stringify([newRule]), row.id]
      );
    }
  }

  // Rollback removes the feature-owned plan and credential rules. Unrelated
  // plans, rules, and credential rows are left untouched. Safe to run repeatedly.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM license_plan WHERE name = $1`, [
      LICENSE_PLAN_NAME,
    ]);

    const policyRows = await queryRunner.query(
      `SELECT id, "credentialRules" FROM license_policy`
    );
    for (const row of policyRows) {
      const rules: Array<{ credentialType?: string }> = Array.isArray(
        row.credentialRules
      )
        ? row.credentialRules
        : [];
      const filtered = rules.filter(
        rule => rule?.credentialType !== CREDENTIAL_TYPE
      );
      if (filtered.length === rules.length) continue;

      await queryRunner.query(
        `UPDATE license_policy SET "credentialRules" = $1::jsonb WHERE id = $2`,
        [JSON.stringify(filtered), row.id]
      );
    }
  }
}

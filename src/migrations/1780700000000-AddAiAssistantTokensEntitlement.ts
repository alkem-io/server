import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 004-web-ai-assistant (FR-027b, Increment B) — assistant BUDGET.
 *
 * Adds the `ACCOUNT_AI_ASSISTANT_TOKENS_MONTH` LIMIT entitlement to the
 * credential-based licensing engine:
 *
 *   1. Grants a per-tier monthly weighted-token allowance on the EXISTING
 *      account credential rules (`account-license-free`, `account-license-plus`)
 *      in every `license_policy.credentialRules` JSONB array.
 *   2. Backfills an entitlement row (limit 0 / disabled) onto every existing
 *      `account` license so `getEntitlementLimit` resolves a value for accounts
 *      created before this migration; the real limit is materialized from the
 *      credential rules above the next time `applyLicensePolicy` runs.
 *
 * ⚠️ The per-tier numbers below are PLACEHOLDER values — a BUSINESS DECISION that
 * is NOT YET SIGNED OFF. They MUST be confirmed (and likely tuned per real token
 * pricing / plan economics) before this ships to production. Access (who may use
 * the assistant) is governed separately by the `ACCESS_VIRTUAL_ASSISTANT`
 * authorization privilege (Increment A) — this entitlement governs only the
 * monthly AMOUNT, never access.
 *
 * Idempotent: re-running neither duplicates grants nor duplicates entitlement
 * rows. Self-contained string constants (no src/ enum imports) so future enum
 * edits never rewrite this migration's history.
 */

// Self-contained copies (do NOT import from src/common/enums).
const ENTITLEMENT_TYPE = 'account-ai-assistant-tokens-month';
const ENTITLEMENT_DATA_TYPE = 'limit';

const ACCOUNT_LICENSE_FREE = 'account-license-free';
const ACCOUNT_LICENSE_PLUS = 'account-license-plus';

// ⚠️ PLACEHOLDER monthly weighted-token allowances — pending business sign-off.
// Accounts have two real tiers in the credential-based engine today: FREE
// (baseline) and PLUS. A future PREMIUM account tier (placeholder ~50,000,000)
// would add its own `account-license-premium` credential rule here.
const PLACEHOLDER_TOKENS_FREE = 1_000_000;
const PLACEHOLDER_TOKENS_PLUS = 10_000_000;

const TIER_GRANTS: Array<{ credentialType: string; limit: number }> = [
  { credentialType: ACCOUNT_LICENSE_FREE, limit: PLACEHOLDER_TOKENS_FREE },
  { credentialType: ACCOUNT_LICENSE_PLUS, limit: PLACEHOLDER_TOKENS_PLUS },
];

interface GrantedEntitlement {
  type?: string;
  limit?: number;
}
interface CredentialRule {
  id?: string;
  credentialType?: string;
  grantedEntitlements?: GrantedEntitlement[];
  name?: string;
}

export class AddAiAssistantTokensEntitlement1780700000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add the per-tier grant to the existing account credential rules.
    const policyRows = await queryRunner.query(
      `SELECT id, "credentialRules" FROM license_policy`
    );
    for (const row of policyRows) {
      const rules: CredentialRule[] = Array.isArray(row.credentialRules)
        ? row.credentialRules
        : [];
      let changed = false;

      for (const { credentialType, limit } of TIER_GRANTS) {
        const rule = rules.find(r => r && r.credentialType === credentialType);
        if (!rule) continue; // tier not present in this policy — skip
        if (!Array.isArray(rule.grantedEntitlements)) {
          rule.grantedEntitlements = [];
        }
        const alreadyGranted = rule.grantedEntitlements.some(
          ge => ge && ge.type === ENTITLEMENT_TYPE
        );
        if (alreadyGranted) continue;
        rule.grantedEntitlements.push({ type: ENTITLEMENT_TYPE, limit });
        changed = true;
      }

      if (changed) {
        await queryRunner.query(
          `UPDATE license_policy SET "credentialRules" = $1::jsonb WHERE id = $2`,
          [JSON.stringify(rules), row.id]
        );
      }
    }

    // 2. Backfill the entitlement row onto existing account licenses.
    await queryRunner.query(
      `INSERT INTO license_entitlement
         (id, "createdDate", "updatedDate", version,
          type, "dataType", "limit", enabled, "licenseId")
       SELECT
         uuid_generate_v4(), NOW(), NOW(), 1,
         $1::varchar, $2::varchar, 0, false, l.id
       FROM license l
       WHERE l.type = 'account'::varchar
         AND NOT EXISTS (
           SELECT 1 FROM license_entitlement le
           WHERE le."licenseId" = l.id
             AND le.type = $1::varchar
         )`,
      [ENTITLEMENT_TYPE, ENTITLEMENT_DATA_TYPE]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Remove the grant from the account credential rules.
    const policyRows = await queryRunner.query(
      `SELECT id, "credentialRules" FROM license_policy`
    );
    for (const row of policyRows) {
      const rules: CredentialRule[] = Array.isArray(row.credentialRules)
        ? row.credentialRules
        : [];
      let changed = false;

      for (const { credentialType } of TIER_GRANTS) {
        const rule = rules.find(r => r && r.credentialType === credentialType);
        if (!rule || !Array.isArray(rule.grantedEntitlements)) continue;
        const filtered = rule.grantedEntitlements.filter(
          ge => !ge || ge.type !== ENTITLEMENT_TYPE
        );
        if (filtered.length !== rule.grantedEntitlements.length) {
          rule.grantedEntitlements = filtered;
          changed = true;
        }
      }

      if (changed) {
        await queryRunner.query(
          `UPDATE license_policy SET "credentialRules" = $1::jsonb WHERE id = $2`,
          [JSON.stringify(rules), row.id]
        );
      }
    }

    // 2. Remove every entitlement row of this type. Safe: the type was
    // introduced by this migration, so no pre-existing rows can match.
    await queryRunner.query(`DELETE FROM license_entitlement WHERE type = $1`, [
      ENTITLEMENT_TYPE,
    ]);
  }
}

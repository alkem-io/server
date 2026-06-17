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
 * Per-tier monthly weighted-token allowances — SIGNED OFF 2026-06-17 (Valentin
 * Yanakiev): free 1,000,000 / plus 10,000,000 / premium 50,000,000. The unit is
 * weighted input-token-equivalents (`prompt + 0.1×cacheRead + 1.25×cacheCreation
 * + 3×completion` — Mistral pricing; see contract §5). Access (who may use the
 * assistant) is governed separately by the `ACCESS_VIRTUAL_ASSISTANT`
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

// Monthly weighted-token allowances — SIGNED OFF 2026-06-17. Accounts have two
// real tiers in the credential-based engine today: FREE (baseline) and PLUS. The
// PREMIUM tier does not exist yet (no `account-license-premium` credential rule);
// its grant below is therefore a harmless no-op on the current run — the up()
// loop skips any tier absent from the policy. The 50,000,000 value is recorded
// (confirmed) so that whenever the premium account tier IS introduced, its
// creating migration grants this same amount. Do NOT fabricate the tier here.
const ACCOUNT_LICENSE_PREMIUM = 'account-license-premium';
const TOKENS_FREE = 1_000_000;
const TOKENS_PLUS = 10_000_000;
const TOKENS_PREMIUM = 50_000_000;

const TIER_GRANTS: Array<{ credentialType: string; limit: number }> = [
  { credentialType: ACCOUNT_LICENSE_FREE, limit: TOKENS_FREE },
  { credentialType: ACCOUNT_LICENSE_PLUS, limit: TOKENS_PLUS },
  // No-op until the premium account tier exists (see note above).
  { credentialType: ACCOUNT_LICENSE_PREMIUM, limit: TOKENS_PREMIUM },
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

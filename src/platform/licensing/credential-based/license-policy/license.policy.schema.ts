import { pgTable, jsonb } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';
import type { ILicensingCredentialBasedPolicyCredentialRule } from '@platform/licensing/credential-based/licensing-credential-based-entitlements-engine/licensing.credential.based.policy.credential.rule.interface';

export const licensePolicies = pgTable('license_policy', {
  ...authorizableColumns,
  credentialRules: jsonb('credentialRules')
    .notNull()
    .$type<ILicensingCredentialBasedPolicyCredentialRule[]>(),
});

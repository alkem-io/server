import { GLOBAL_POLICY_LICENSE_DEFINITION_ADMIN } from '@common/constants/authorization/global.policy.constants';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';

/**
 * 027-platform-role-redesign (corr-server-7/corr-server-10, server-C2-a
 * advocate/skeptic debate) — A13's license-definition mutations
 * (createLicensePlan, deleteLicensePlan, updateLicensePlan,
 * adminLicensePolicy{Create,Update,Delete}CredentialRule) must be checked
 * against THIS resolver-local, hardcoded IN_MEMORY policy — NOT
 * `licensing(Framework).authorization` or `licensePolicy.authorization`,
 * both of which inherit the root policy as their parent, so the root rule's
 * `platform-content-full-access` CRUD cascade (T036a) would otherwise
 * satisfy these bare CREATE/READ/UPDATE/DELETE checks too — a reach
 * family SC-004's exception does not cover.
 *
 * GLOBAL_ADMIN is included (corr-server-10 fix): it reached A13 today only
 * via the root cascade, an implicit reach the declaration omitted.
 * GLOBAL_SUPPORT is included (corr-server-12 fix): it reaches A13 via
 * `globalSupportPlatformAdmin`'s cascade off `platform.authorization`
 * (platform.service.authorization.ts) into `licensingFramework.
 * authorization` — an implicit reach the declaration likewise omitted.
 *
 * server-C2-a closed the one A13 surface (createLicensePlan) the T058
 * census missed — it kept checking `licensing.authorization` directly and
 * so was the only one still open to the root cascade. Centralizing the
 * construction here (previously copy-pasted, constructor-built, in both
 * the license.plan and license.policy resolvers) makes createLicensePlan
 * share the exact same policy instead of a sixth hand-rolled copy.
 */
export const A13_INTENDED_OWNERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.PLATFORM_SETTINGS_ADMIN,
];
export const A13_LEGACY_REACHERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.GLOBAL_ADMIN,
  AuthorizationCredential.GLOBAL_SUPPORT,
  AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
  AuthorizationCredential.GLOBAL_PLATFORM_MANAGER,
];

/**
 * Pure builder — takes no service dependency, so every A13 resolver can
 * construct its own `licenseDefinitionPolicy` field without an
 * `AuthorizationPolicyService` injection just to run this one-off,
 * IN_MEMORY, never-persisted rule.
 */
export const buildLicenseDefinitionPolicy = (): IAuthorizationPolicy => {
  const policy = new AuthorizationPolicy(AuthorizationPolicyType.IN_MEMORY);
  const criterias: ICredentialDefinition[] = [
    ...A13_INTENDED_OWNERS,
    ...A13_LEGACY_REACHERS,
  ].map(type => ({ type, resourceID: '' }));

  policy.credentialRules = [
    new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
      criterias,
      GLOBAL_POLICY_LICENSE_DEFINITION_ADMIN
    ),
  ];

  return policy;
};

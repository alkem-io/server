import { GLOBAL_POLICY_LICENSE_DEFINITION_ADMIN } from '@common/constants/authorization/global.policy.constants';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { describe, expect, it } from 'vitest';
import {
  A13_INTENDED_OWNERS,
  buildLicenseDefinitionPolicy,
} from './license.definition.policy';

// Pins the effective credential set of the license-definition policy: the
// six license-plan / license-policy mutations are checked against this
// in-memory policy alone, so any change to who it admits is an
// authorization change, never a refactor.
describe('buildLicenseDefinitionPolicy', () => {
  it('declares Platform Settings Admin as the only intended owner', () => {
    expect(A13_INTENDED_OWNERS).toEqual([
      AuthorizationCredential.PLATFORM_SETTINGS_ADMIN,
    ]);
  });

  it('builds an in-memory policy with exactly one credential rule', () => {
    const policy = buildLicenseDefinitionPolicy();

    expect(policy.type).toBe(AuthorizationPolicyType.IN_MEMORY);
    expect(policy.credentialRules).toHaveLength(1);
  });

  it('admits exactly Platform Settings Admin, for CREATE/READ/UPDATE/DELETE, under the license-definition rule name', () => {
    const [rule] = buildLicenseDefinitionPolicy().credentialRules;

    expect(rule.criterias).toEqual([
      {
        type: AuthorizationCredential.PLATFORM_SETTINGS_ADMIN,
        resourceID: '',
      },
    ]);
    expect(rule.grantedPrivileges).toEqual([
      AuthorizationPrivilege.CREATE,
      AuthorizationPrivilege.READ,
      AuthorizationPrivilege.UPDATE,
      AuthorizationPrivilege.DELETE,
    ]);
    expect(rule.name).toBe(GLOBAL_POLICY_LICENSE_DEFINITION_ADMIN);
  });
});

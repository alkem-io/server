import {
  AlkemioErrorStatus,
  AuthorizationCredential,
  AuthorizationPrivilege,
} from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { describe, expect, it, vi } from 'vitest';
import { AdminUserSecondFactorResolverMutations } from './admin.user.second.factor.resolver.mutations';
import { AdminUserSecondFactorService } from './admin.user.second.factor.service';

// The platform policy as `platform.service.authorization.ts` builds it for
// this privilege.
const platformPolicy = {
  id: 'platform-policy',
  credentialRules: [
    {
      name: 'credentialRuleTypes-platformSecondFactorReset',
      grantedPrivileges: [AuthorizationPrivilege.PLATFORM_SECOND_FACTOR_RESET],
      criterias: [
        { type: AuthorizationCredential.PLATFORM_SUPPORT, resourceID: '' },
        { type: AuthorizationCredential.PLATFORM_USERS_ADMIN, resourceID: '' },
      ],
      cascade: false,
    },
  ],
  privilegeRules: [],
};

async function build() {
  const resetService = {
    resetSecondFactor: vi.fn().mockResolvedValue({
      removedCredentialTypes: ['totp'],
      sessionsRevoked: 1,
    }),
  };
  const module = await Test.createTestingModule({
    providers: [
      AdminUserSecondFactorResolverMutations,
      AuthorizationService,
      MockWinstonProvider,
      {
        provide: PlatformAuthorizationPolicyService,
        useValue: {
          getPlatformAuthorizationPolicy: vi
            .fn()
            .mockResolvedValue(platformPolicy),
        },
      },
      { provide: AdminUserSecondFactorService, useValue: resetService },
    ],
  }).compile();
  return {
    resolver: module.get(AdminUserSecondFactorResolverMutations),
    resetService,
  };
}

const actorWith = (credential: AuthorizationCredential) =>
  Object.assign(new ActorContext(), {
    actorID: 'actor-1',
    credentials: [{ type: credential, resourceID: '' }],
  });

describe('AdminUserSecondFactorResolverMutations.adminResetUserSecondFactor', () => {
  it.each([
    ['Platform Support', AuthorizationCredential.PLATFORM_SUPPORT],
    ['a Platform Users Admin', AuthorizationCredential.PLATFORM_USERS_ADMIN],
  ])('lets %s reset the target', async (_label, credential) => {
    const { resolver, resetService } = await build();
    const actor = actorWith(credential);

    const result = await resolver.adminResetUserSecondFactor(actor, {
      userID: 'user-2',
    });

    expect(resetService.resetSecondFactor).toHaveBeenCalledWith(
      actor,
      'user-2'
    );
    expect(result).toEqual({
      removedCredentialTypes: ['totp'],
      sessionsRevoked: 1,
    });
  });

  it('refuses a Platform Settings Admin with FORBIDDEN_POLICY', async () => {
    const { resolver, resetService } = await build();

    const error = await resolver
      .adminResetUserSecondFactor(
        actorWith(AuthorizationCredential.PLATFORM_SETTINGS_ADMIN),
        { userID: 'user-2' }
      )
      .catch(e => e);

    expect(error.extensions?.code).toBe(AlkemioErrorStatus.FORBIDDEN_POLICY);
    expect(resetService.resetSecondFactor).not.toHaveBeenCalled();
  });
});

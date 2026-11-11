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
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it, vi } from 'vitest';
import { AdminUserSecondFactorResolverMutations } from './admin.user.second.factor.resolver.mutations';
import { AdminUserSecondFactorService } from './admin.user.second.factor.service';
import { AdminResetUserSecondFactorInput } from './dto/admin.user.second.factor.dto';

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
      passwordInvalidated: true,
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
      invalidatePassword: true,
    });

    expect(resetService.resetSecondFactor).toHaveBeenCalledWith(
      actor,
      'user-2',
      true
    );
    expect(result).toEqual({
      removedCredentialTypes: ['totp'],
      sessionsRevoked: 1,
      passwordInvalidated: true,
    });
  });

  it('refuses an input that omits invalidatePassword', async () => {
    const input = plainToInstance(AdminResetUserSecondFactorInput, {
      userID: '8a2c3d4e-5f60-4a1b-9c2d-3e4f5a6b7c8d',
    });

    const errors = await validate(input);

    expect(errors.map(e => e.property)).toEqual(['invalidatePassword']);
  });

  it('refuses a Platform Settings Admin with FORBIDDEN_POLICY', async () => {
    const { resolver, resetService } = await build();

    const error = await resolver
      .adminResetUserSecondFactor(
        actorWith(AuthorizationCredential.PLATFORM_SETTINGS_ADMIN),
        { userID: 'user-2', invalidatePassword: false }
      )
      .catch(e => e);

    expect(error.extensions?.code).toBe(AlkemioErrorStatus.FORBIDDEN_POLICY);
    expect(resetService.resetSecondFactor).not.toHaveBeenCalled();
  });
});

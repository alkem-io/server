import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { PlatformUserRecordAuditService } from '@src/platform-admin/platform-user-record-audit/platform.user.record.audit.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { AdminIdentityResolverMutations } from './admin.identity.resolver.mutations';
import { AdminIdentityService } from './admin.identity.service';

/**
 * 027-platform-role-redesign (T062, A5, T063, T070e) — single-path surface
 * (platform-wide PLATFORM_USERS_ADMIN gate, no self-service branch): both
 * the permitted (with audit write) and denied path.
 */
describe('AdminIdentityResolverMutations', () => {
  let resolver: AdminIdentityResolverMutations;
  let authorizationService: Record<string, Mock>;
  let adminIdentityService: Record<string, Mock>;
  let userLookupService: Record<string, Mock>;
  let platformUserRecordAuditService: Record<string, Mock>;

  const actorContext = { actorID: 'actor-1' } as unknown as ActorContext;

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminIdentityResolverMutations],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AdminIdentityResolverMutations);
    authorizationService = module.get(AuthorizationService) as any;
    adminIdentityService = module.get(AdminIdentityService) as any;
    userLookupService = module.get(UserLookupService) as any;
    platformUserRecordAuditService = module.get(
      PlatformUserRecordAuditService
    ) as any;
    module.get(PlatformAuthorizationPolicyService);
  });

  it('permitted: gates on PLATFORM_USERS_ADMIN, deletes the identity and audits the real target user', async () => {
    authorizationService.grantAccessOrFail.mockReturnValue(true);
    userLookupService.getUserByAuthenticationID.mockResolvedValue({
      id: 'user-1',
    });
    adminIdentityService.deleteIdentity.mockResolvedValue(true);

    const result = await resolver.adminIdentityDeleteKratosIdentity(
      actorContext,
      'kratos-1'
    );

    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      actorContext,
      expect.anything(),
      AuthorizationPrivilege.PLATFORM_USERS_ADMIN,
      expect.any(String)
    );
    expect(result).toBe(true);
    expect(
      platformUserRecordAuditService.recordActionForActor
    ).toHaveBeenCalledWith(
      actorContext,
      expect.any(Array),
      expect.any(Array),
      expect.objectContaining({
        action: 'adminIdentityDeleteKratosIdentity',
        targetUserId: 'user-1',
        kratosIdentityId: 'kratos-1',
        outcome: 'identity_deleted',
      })
    );
  });

  it('denied: propagates the authorization failure without deleting or auditing', async () => {
    authorizationService.grantAccessOrFail.mockImplementation(() => {
      throw new Error('Forbidden');
    });

    await expect(
      resolver.adminIdentityDeleteKratosIdentity(actorContext, 'kratos-1')
    ).rejects.toThrow('Forbidden');
    expect(adminIdentityService.deleteIdentity).not.toHaveBeenCalled();
    expect(
      platformUserRecordAuditService.recordActionForActor
    ).not.toHaveBeenCalled();
  });

  it('does not audit a FAILED identity deletion', async () => {
    authorizationService.grantAccessOrFail.mockReturnValue(true);
    userLookupService.getUserByAuthenticationID.mockResolvedValue({
      id: 'user-1',
    });
    adminIdentityService.deleteIdentity.mockResolvedValue(false);

    const result = await resolver.adminIdentityDeleteKratosIdentity(
      actorContext,
      'kratos-1'
    );

    expect(result).toBe(false);
    expect(
      platformUserRecordAuditService.recordActionForActor
    ).not.toHaveBeenCalled();
  });
});

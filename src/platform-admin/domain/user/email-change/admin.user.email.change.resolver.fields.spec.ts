import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserEmailChangeService } from '@domain/community/user-email-change/user.email.change.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { AdminUserEmailChangeResolverFields } from './admin.user.email.change.resolver.fields';

/**
 * 027-platform-role-redesign (T050a, A19 sites 2+3 of 3, T070e) — both
 * `platform_audit_entry`-projecting fields are re-anchored off the retiring
 * PLATFORM_ADMIN catch-all onto PLATFORM_AUDIT_READ. Single-path surfaces
 * (no owner branch): asserts the gate fires on BOTH fields, in BOTH the
 * permitted and denied direction (SC-018).
 */
describe('AdminUserEmailChangeResolverFields', () => {
  let resolver: AdminUserEmailChangeResolverFields;
  let authorizationService: Record<string, Mock>;
  let userEmailChangeService: Record<string, Mock>;

  const actorContext = { actorID: 'actor-1' } as unknown as ActorContext;

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminUserEmailChangeResolverFields],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AdminUserEmailChangeResolverFields);
    authorizationService = module.get(AuthorizationService) as any;
    userEmailChangeService = module.get(UserEmailChangeService) as any;
    module.get(PlatformAuthorizationPolicyService);
  });

  describe('latestUserEmailChangeAuditEntry', () => {
    it('permitted: gates on PLATFORM_AUDIT_READ and returns null when no entry exists', async () => {
      authorizationService.grantAccessOrFail.mockReturnValue(true);
      userEmailChangeService.getLatestAuditEntryForSubject.mockResolvedValue(
        null
      );

      const result = await resolver.latestUserEmailChangeAuditEntry(
        actorContext,
        'subject-1'
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        expect.anything(),
        AuthorizationPrivilege.PLATFORM_AUDIT_READ,
        expect.any(String)
      );
      expect(result).toBeNull();
    });

    it('denied: propagates the authorization failure without reading the audit store', async () => {
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw new Error('Forbidden');
      });

      await expect(
        resolver.latestUserEmailChangeAuditEntry(actorContext, 'subject-1')
      ).rejects.toThrow('Forbidden');
      expect(
        userEmailChangeService.getLatestAuditEntryForSubject
      ).not.toHaveBeenCalled();
    });
  });

  describe('userEmailChangeAuditEntries', () => {
    it('permitted: gates on PLATFORM_AUDIT_READ and returns the paginated page', async () => {
      authorizationService.grantAccessOrFail.mockReturnValue(true);
      userEmailChangeService.getAuditEntriesForSubject.mockResolvedValue({
        entries: [],
        startCursor: null,
        endCursor: null,
        hasNextPage: false,
        hasPreviousPage: false,
        total: 0,
      });

      const result = await resolver.userEmailChangeAuditEntries(
        actorContext,
        'subject-1'
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        expect.anything(),
        AuthorizationPrivilege.PLATFORM_AUDIT_READ,
        expect.any(String)
      );
      expect(result.auditEntries).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('denied: propagates the authorization failure without reading the audit store', async () => {
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw new Error('Forbidden');
      });

      await expect(
        resolver.userEmailChangeAuditEntries(actorContext, 'subject-1')
      ).rejects.toThrow('Forbidden');
      expect(
        userEmailChangeService.getAuditEntriesForSubject
      ).not.toHaveBeenCalled();
    });
  });
});

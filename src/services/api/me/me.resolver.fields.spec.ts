import { AccountDeletionBlockerService } from '@domain/community/user/account-deletion/account.deletion.blocker.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { createMock } from '@golevelup/ts-vitest';
import { InAppNotificationService } from '@platform/in-app-notification/in.app.notification.service';
import { McpApiKeyService } from '@services/mcp-server/auth/mcp-api-key.service';
import { LogContext } from '@src/common/enums';
import { MeResolverFields } from './me.resolver.fields';
import { MeService } from './me.service';

const actorContext = { actorID: 'user-123', isAnonymous: false } as any;
const anonymousActorContext = { actorID: '' } as any;

describe('MeResolverFields', () => {
  let resolver: MeResolverFields;
  let meService: ReturnType<typeof createMock<MeService>>;
  let inAppNotificationService: ReturnType<
    typeof createMock<InAppNotificationService>
  >;
  let mcpApiKeyServiceMock: ReturnType<typeof createMock<McpApiKeyService>>;
  let accountDeletionBlockerServiceMock: ReturnType<
    typeof createMock<AccountDeletionBlockerService>
  >;
  let accountLookupServiceMock: ReturnType<
    typeof createMock<AccountLookupService>
  >;
  // A plain stub injected as the resolver's logger. Deliberately NOT a
  // `vi.spyOn(Logger.prototype, …)`: vitest runs with `isolate: false`, so a
  // prototype spy that is never restored leaks a no-op logger into every later
  // spec file sharing the worker.
  let logger: { verbose: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    logger = { verbose: vi.fn() };
    meService = createMock<MeService>();
    meService.getCommunityInvitationsCountForUser.mockResolvedValue(3);
    meService.getCommunityInvitationsForUser.mockResolvedValue([]);
    meService.getCommunityApplicationsForUser.mockResolvedValue([]);
    meService.getSpaceMembershipsHierarchical.mockResolvedValue([]);
    meService.getSpaceMembershipsFlat.mockResolvedValue([]);
    meService.getMySpaces.mockResolvedValue([]);

    const userLookupService = createMock<UserLookupService>();
    userLookupService.getUserByIdOrFail.mockResolvedValue({
      id: 'user-123',
    } as any);

    inAppNotificationService = createMock<InAppNotificationService>();
    inAppNotificationService.getPaginatedNotifications.mockResolvedValue({
      items: [],
    } as any);
    inAppNotificationService.getRawNotificationsUnreadCount.mockResolvedValue(
      5
    );

    mcpApiKeyServiceMock = createMock<McpApiKeyService>();
    mcpApiKeyServiceMock.listUserKeysForProjection.mockResolvedValue([]);

    accountDeletionBlockerServiceMock =
      createMock<AccountDeletionBlockerService>();
    accountDeletionBlockerServiceMock.getBlockers.mockResolvedValue({
      canDelete: true,
      blockers: [],
      totals: [],
      truncated: false,
    });

    accountLookupServiceMock = createMock<AccountLookupService>();
    accountLookupServiceMock.getAccountOrFail.mockResolvedValue({
      id: 'account-1',
    } as any);

    resolver = new MeResolverFields(
      meService,
      userLookupService,
      inAppNotificationService,
      mcpApiKeyServiceMock,
      accountDeletionBlockerServiceMock,
      accountLookupServiceMock,
      logger as any
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should return me-{actorID} for id field', () => {
    expect(resolver.id(actorContext)).toBe('me-user-123');
  });

  it('should return null for user when actorID is missing', async () => {
    const result = await resolver.user({
      actorID: '',
      isAnonymous: true,
    } as any);
    expect(result).toBeNull();
  });

  it('should return null for user when anonymous', async () => {
    const result = await resolver.user({
      actorID: 'user-1',
      isAnonymous: true,
    } as any);
    expect(result).toBeNull();
  });

  it('should return user when authenticated', async () => {
    const result = await resolver.user(actorContext);
    expect(result).toBeDefined();
    expect(result?.id).toBe('user-123');
  });

  describe('notifications degradation', () => {
    it('should return the empty page when actorID is missing, without throwing', async () => {
      const result = await resolver.notificationsInApp(
        anonymousActorContext,
        {} as any
      );
      expect(result).toEqual({
        total: 0,
        items: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });
    });

    it('should emit a verbose log when degrading notifications', async () => {
      await resolver.notificationsInApp(anonymousActorContext, {} as any);
      expect(logger.verbose).toHaveBeenCalledTimes(1);
      expect(logger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('me.notifications'),
        LogContext.AUTH
      );
    });

    it('should not call the in-app notification service when actorID is missing', async () => {
      await resolver.notificationsInApp(anonymousActorContext, {} as any);
      expect(
        inAppNotificationService.getPaginatedNotifications
      ).not.toHaveBeenCalled();
    });

    it('should return notifications when authenticated', async () => {
      const result = await resolver.notificationsInApp(actorContext, {} as any);
      expect(result).toBeDefined();
      expect(
        inAppNotificationService.getPaginatedNotifications
      ).toHaveBeenCalledWith(actorContext.actorID, {}, undefined);
    });
  });

  describe('notificationsUnreadCount degradation', () => {
    it('should return 0 when actorID is missing, without throwing', async () => {
      const result = await resolver.notificationsUnreadCount(
        anonymousActorContext
      );
      expect(result).toBe(0);
    });

    it('should emit a verbose log when degrading notificationsUnreadCount', async () => {
      await resolver.notificationsUnreadCount(anonymousActorContext);
      expect(logger.verbose).toHaveBeenCalledTimes(1);
      expect(logger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('me.notificationsUnreadCount'),
        LogContext.AUTH
      );
    });

    it('should not call the in-app notification service when actorID is missing', async () => {
      await resolver.notificationsUnreadCount(anonymousActorContext);
      expect(
        inAppNotificationService.getRawNotificationsUnreadCount
      ).not.toHaveBeenCalled();
    });

    it('should return unread count when authenticated', async () => {
      const result = await resolver.notificationsUnreadCount(actorContext);
      expect(result).toBe(5);
      expect(
        inAppNotificationService.getRawNotificationsUnreadCount
      ).toHaveBeenCalledWith(actorContext.actorID);
    });
  });

  describe('communityInvitationsCount degradation', () => {
    it('should return 0 when actorID is missing, without throwing', async () => {
      const result = await resolver.communityInvitationsCount(
        anonymousActorContext,
        []
      );
      expect(result).toBe(0);
    });

    it('should emit a verbose log when degrading communityInvitationsCount', async () => {
      await resolver.communityInvitationsCount(anonymousActorContext, []);
      expect(logger.verbose).toHaveBeenCalledTimes(1);
      expect(logger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('me.communityInvitationsCount'),
        LogContext.AUTH
      );
    });

    it('should not call meService when actorID is missing', async () => {
      await resolver.communityInvitationsCount(anonymousActorContext, []);
      expect(
        meService.getCommunityInvitationsCountForUser
      ).not.toHaveBeenCalled();
    });

    it('should return invitations count when authenticated', async () => {
      const result = await resolver.communityInvitationsCount(actorContext, []);
      expect(result).toBe(3);
      expect(
        meService.getCommunityInvitationsCountForUser
      ).toHaveBeenCalledWith(actorContext.actorID, []);
    });
  });

  describe('communityInvitations degradation', () => {
    it('should return an empty array when actorID is missing, without throwing', async () => {
      const result = await resolver.communityInvitations(
        anonymousActorContext,
        []
      );
      expect(result).toEqual([]);
    });

    it('should emit a verbose log when degrading communityInvitations', async () => {
      await resolver.communityInvitations(anonymousActorContext, []);
      expect(logger.verbose).toHaveBeenCalledTimes(1);
      expect(logger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('me.communityInvitations'),
        LogContext.AUTH
      );
    });

    it('should not call meService when actorID is missing', async () => {
      await resolver.communityInvitations(anonymousActorContext, []);
      expect(meService.getCommunityInvitationsForUser).not.toHaveBeenCalled();
    });

    it('should return invitations when authenticated', async () => {
      const result = await resolver.communityInvitations(actorContext, []);
      expect(result).toEqual([]);
      expect(meService.getCommunityInvitationsForUser).toHaveBeenCalledWith(
        actorContext.actorID,
        []
      );
    });
  });

  describe('communityApplications degradation', () => {
    it('should return an empty array when actorID is missing, without throwing', async () => {
      const result = await resolver.communityApplications(
        anonymousActorContext,
        []
      );
      expect(result).toEqual([]);
    });

    it('should emit a verbose log when degrading communityApplications', async () => {
      await resolver.communityApplications(anonymousActorContext, []);
      expect(logger.verbose).toHaveBeenCalledTimes(1);
      expect(logger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('me.communityApplications'),
        LogContext.AUTH
      );
    });

    it('should not call meService when actorID is missing', async () => {
      await resolver.communityApplications(anonymousActorContext, []);
      expect(meService.getCommunityApplicationsForUser).not.toHaveBeenCalled();
    });

    it('should return applications when authenticated', async () => {
      const result = await resolver.communityApplications(actorContext, []);
      expect(result).toEqual([]);
      expect(meService.getCommunityApplicationsForUser).toHaveBeenCalledWith(
        actorContext.actorID,
        []
      );
    });
  });

  it('should return spaceMembershipsHierarchical', async () => {
    const result = await resolver.spaceMembershipsHierarchical(
      actorContext,
      10
    );
    expect(result).toEqual([]);
  });

  it('should return spaceMembershipsFlat', async () => {
    const result = await resolver.spaceMembershipsFlat(actorContext);
    expect(result).toEqual([]);
  });

  it('should return mySpaces', async () => {
    const result = await resolver.mySpaces(actorContext, 10);
    expect(result).toEqual([]);
  });

  describe('mcpApiKeys (workspace#038)', () => {
    it('returns an empty array when actorID is missing, without throwing', async () => {
      const result = await resolver.mcpApiKeys(anonymousActorContext);
      expect(result).toEqual([]);
    });

    it('does not call the service when actorID is missing', async () => {
      await resolver.mcpApiKeys(anonymousActorContext);
      expect(
        mcpApiKeyServiceMock.listUserKeysForProjection
      ).not.toHaveBeenCalled();
    });

    it("returns only the caller's keys, newest first, incl. revoked/expired, with no keyHash (FR-008/FR-009, US2-AS2)", async () => {
      const now = new Date('2026-08-12T00:00:00.000Z');
      const older = new Date('2026-08-01T00:00:00.000Z');
      mcpApiKeyServiceMock.listUserKeysForProjection.mockResolvedValue([
        {
          id: 'k-new',
          name: 'new key',
          scopes: [{ operations: ['read'] }],
          createdDate: now,
          isActive: true,
        },
        {
          id: 'k-revoked',
          name: 'revoked key',
          scopes: [{ operations: ['tools'] }],
          createdDate: older,
          isActive: false,
        },
      ] as any);

      const result = await resolver.mcpApiKeys(actorContext);

      expect(
        mcpApiKeyServiceMock.listUserKeysForProjection
      ).toHaveBeenCalledWith(actorContext.actorID);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('k-new');
      expect(result[1].id).toBe('k-revoked');
      expect(result[1].status).toBe('revoked');
      for (const key of result) {
        expect(key).not.toHaveProperty('keyHash');
      }
    });
  });

  describe('conversations degradation', () => {
    it('should return the empty container when actorID is missing, without throwing', async () => {
      const result = await resolver.conversations(anonymousActorContext);
      expect(result).toEqual({});
    });

    // No log assertion for this field. The guard that used to sit here was
    // dead — both branches returned the same empty envelope, so it only ever
    // added a log line. The real degradation is asserted in
    // me.conversations.resolver.fields.spec.ts, which owns the fields inside.
    it('should not log for the empty container, which is the same either way', async () => {
      const result = await resolver.conversations(anonymousActorContext);

      expect(result).toEqual({});
      expect(logger.verbose).not.toHaveBeenCalled();
    });

    it('should return conversations result when authenticated', async () => {
      const result = await resolver.conversations(actorContext);
      expect(result).toBeDefined();
      expect(logger.verbose).not.toHaveBeenCalled();
    });
  });

  describe('accountDeletion', () => {
    it('degrades to the empty status when unauthenticated, without calling the blocker service', async () => {
      const result = await resolver.accountDeletion(anonymousActorContext);

      expect(result).toEqual({
        canDelete: false,
        sessionFresh: false,
        blockers: [],
        truncated: false,
        totals: [],
        externalSubscriptionLinked: false,
      });
      expect(
        accountDeletionBlockerServiceMock.getBlockers
      ).not.toHaveBeenCalled();
    });

    it('calls the shared blocker predicate on the self branch (FR-006 same-predicate)', async () => {
      const userWithAccount = { id: 'user-123', accountID: 'account-1' };
      const userLookupService = createMock<UserLookupService>();
      userLookupService.getUserByIdOrFail.mockResolvedValue(
        userWithAccount as any
      );
      resolver = new MeResolverFields(
        meService,
        userLookupService,
        inAppNotificationService,
        mcpApiKeyServiceMock,
        accountDeletionBlockerServiceMock,
        accountLookupServiceMock,
        logger as any
      );

      await resolver.accountDeletion(actorContext);

      expect(
        accountDeletionBlockerServiceMock.getBlockers
      ).toHaveBeenCalledWith('user-123', 'account-1', 'self');
    });

    it('reports sessionFresh true within the privileged window and false when stale/missing', async () => {
      const fresh = { ...actorContext, issuedAt: Date.now() - 60_000 };
      const stale = {
        ...actorContext,
        issuedAt: Date.now() - 16 * 60 * 1000,
      };
      const missing = { ...actorContext, issuedAt: undefined };

      expect((await resolver.accountDeletion(fresh)).sessionFresh).toBe(true);
      expect((await resolver.accountDeletion(stale)).sessionFresh).toBe(false);
      expect((await resolver.accountDeletion(missing)).sessionFresh).toBe(
        false
      );
    });

    it('maps the stored externalSubscriptionID to a boolean linkage flag', async () => {
      accountLookupServiceMock.getAccountOrFail.mockResolvedValue({
        id: 'account-1',
        externalSubscriptionID: 'wingback-1',
      } as any);

      const result = await resolver.accountDeletion(actorContext);

      expect(result.externalSubscriptionLinked).toBe(true);
    });

    it('reports externalSubscriptionLinked false when no subscription is stored', async () => {
      accountLookupServiceMock.getAccountOrFail.mockResolvedValue({
        id: 'account-1',
        externalSubscriptionID: undefined,
      } as any);

      const result = await resolver.accountDeletion(actorContext);

      expect(result.externalSubscriptionLinked).toBe(false);
    });

    it('passes through canDelete/blockers/truncated/totals from the blocker service verbatim', async () => {
      accountDeletionBlockerServiceMock.getBlockers.mockResolvedValue({
        canDelete: false,
        blockers: [
          {
            kind: 'ACCOUNT_SPACE' as any,
            resourceID: 'space-1',
            displayName: 'My Space',
            selfResolvable: true,
          },
        ],
        totals: [{ kind: 'ACCOUNT_SPACE' as any, total: 1 }],
        truncated: false,
      });

      const result = await resolver.accountDeletion(actorContext);

      expect(result.canDelete).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0].displayName).toBe('My Space');
      expect(result.totals).toEqual([{ kind: 'ACCOUNT_SPACE', total: 1 }]);
    });
  });
});

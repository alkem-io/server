import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
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

    const mcpApiKeyService = createMock<McpApiKeyService>();
    mcpApiKeyService.listUserKeysForProjection.mockResolvedValue([]);

    resolver = new MeResolverFields(
      meService,
      userLookupService,
      inAppNotificationService,
      mcpApiKeyService,
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
});

import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { createMock } from '@golevelup/ts-vitest';
import { InAppNotificationService } from '@platform/in-app-notification/in.app.notification.service';
import { MeResolverFields } from './me.resolver.fields';
import { MeService } from './me.service';

const actorContext = { actorID: 'user-123', isAnonymous: false } as any;

describe('MeResolverFields', () => {
  let resolver: MeResolverFields;

  beforeEach(() => {
    const meService = createMock<MeService>();
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

    const inAppNotificationService = createMock<InAppNotificationService>();
    inAppNotificationService.getPaginatedNotifications.mockResolvedValue({
      items: [],
    } as any);
    inAppNotificationService.getRawNotificationsUnreadCount.mockResolvedValue(
      5
    );

    resolver = new MeResolverFields(
      meService,
      userLookupService,
      inAppNotificationService
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

  it('should throw when actorID is missing for notifications', async () => {
    await expect(
      resolver.notificationsInApp({ actorID: '' } as any, {} as any)
    ).rejects.toThrow();
  });

  it('should return notifications when authenticated', async () => {
    const result = await resolver.notificationsInApp(actorContext, {} as any);
    expect(result).toBeDefined();
  });

  it('should throw when actorID is missing for notificationsUnreadCount', async () => {
    await expect(
      resolver.notificationsUnreadCount({ actorID: '' } as any)
    ).rejects.toThrow();
  });

  it('should return unread count when authenticated', async () => {
    const result = await resolver.notificationsUnreadCount(actorContext);
    expect(result).toBe(5);
  });

  it('should throw when actorID is missing for communityInvitationsCount', async () => {
    await expect(
      resolver.communityInvitationsCount({ actorID: '' } as any, [])
    ).rejects.toThrow();
  });

  it('should return invitations count when authenticated', async () => {
    const result = await resolver.communityInvitationsCount(actorContext, []);
    expect(result).toBe(3);
  });

  it('should throw when actorID is missing for communityInvitations', async () => {
    await expect(
      resolver.communityInvitations({ actorID: '' } as any, [])
    ).rejects.toThrow();
  });

  it('should return invitations when authenticated', async () => {
    const result = await resolver.communityInvitations(actorContext, []);
    expect(result).toEqual([]);
  });

  it('should throw when actorID is missing for communityApplications', async () => {
    await expect(
      resolver.communityApplications({ actorID: '' } as any, [])
    ).rejects.toThrow();
  });

  it('should return applications when authenticated', async () => {
    const result = await resolver.communityApplications(actorContext, []);
    expect(result).toEqual([]);
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

  it('should throw when actorID is missing for conversations', async () => {
    await expect(
      resolver.conversations({ actorID: '' } as any)
    ).rejects.toThrow();
  });

  it('should return conversations result when authenticated', async () => {
    const result = await resolver.conversations(actorContext);
    expect(result).toBeDefined();
  });
});

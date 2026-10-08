import { RoleChangeType } from '@alkemio/notifications-lib';
import { vi } from 'vitest';
import { InAppNotificationPayloadPlatformGlobalRoleChangeResolverFields } from './in.app.notification.payload.platform.global.role.change.resolver.fields';

describe('InAppNotificationPayloadPlatformGlobalRoleChangeResolverFields', () => {
  const resolver =
    new InAppNotificationPayloadPlatformGlobalRoleChangeResolverFields();

  const makeLoader = (returnValue: unknown) => ({
    load: vi.fn().mockResolvedValue(returnValue),
  });

  describe('user', () => {
    it('loads the User by userID', async () => {
      const loader = makeLoader({ id: 'user-1' });

      const result = await resolver.user(
        { userID: 'user-1', roleName: 'platform-support' } as any,
        loader as any
      );

      expect(loader.load).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ id: 'user-1' });
    });
  });

  describe('role', () => {
    it('returns the stored raw role slug verbatim', () => {
      expect(
        resolver.role({
          userID: 'user-1',
          roleName: 'platform-resource-admin',
        } as any)
      ).toBe('platform-resource-admin');
    });
  });

  describe('changeType', () => {
    it('returns the stored change direction for a record that has one', () => {
      expect(
        resolver.changeType({
          userID: 'user-1',
          roleName: 'platform-support',
          changeType: RoleChangeType.ADDED,
        } as any)
      ).toBe(RoleChangeType.ADDED);

      expect(
        resolver.changeType({
          userID: 'user-1',
          roleName: 'platform-support',
          changeType: RoleChangeType.REMOVED,
        } as any)
      ).toBe(RoleChangeType.REMOVED);
    });

    it('returns undefined for a record written before this field existed', () => {
      expect(
        resolver.changeType({
          userID: 'user-1',
          roleName: 'platform-support',
        } as any)
      ).toBeUndefined();
    });
  });
});

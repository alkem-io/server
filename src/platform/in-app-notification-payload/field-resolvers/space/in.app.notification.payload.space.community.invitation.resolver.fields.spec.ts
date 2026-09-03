import { vi } from 'vitest';
import { InAppNotificationPayloadSpaceCommunityInvitationResolverFields } from './in.app.notification.payload.space.community.invitation.resolver.fields';

describe('InAppNotificationPayloadSpaceCommunityInvitationResolverFields', () => {
  const resolver =
    new InAppNotificationPayloadSpaceCommunityInvitationResolverFields();

  const makeLoader = (returnValue: unknown) => ({
    load: vi.fn().mockResolvedValue(returnValue),
  });

  describe('space', () => {
    it('loads the Space by spaceID', async () => {
      const loader = makeLoader({ id: 'space-1' });

      const result = await resolver.space(
        { spaceID: 'space-1' } as any,
        loader as any
      );

      expect(loader.load).toHaveBeenCalledWith('space-1');
      expect(result).toEqual({ id: 'space-1' });
    });
  });

  describe('organization', () => {
    it('returns null without calling the loader when organizationID is absent (the user-invite event)', async () => {
      const loader = makeLoader({ id: 'org-1' });

      const result = await resolver.organization(
        { spaceID: 'space-1' } as any,
        loader as any
      );

      expect(result).toBeNull();
      expect(loader.load).not.toHaveBeenCalled();
    });

    it('loads the Organization by organizationID when present (the org-invite event)', async () => {
      const loader = makeLoader({ id: 'org-1' });

      const result = await resolver.organization(
        { spaceID: 'space-1', organizationID: 'org-1' } as any,
        loader as any
      );

      expect(loader.load).toHaveBeenCalledWith('org-1');
      expect(result).toEqual({ id: 'org-1' });
    });
  });

  describe('invitation', () => {
    it('loads the Invitation by invitationID', async () => {
      const loader = makeLoader({ id: 'inv-1' });

      const result = await resolver.invitation(
        { invitationID: 'inv-1' } as any,
        loader as any
      );

      expect(loader.load).toHaveBeenCalledWith('inv-1');
      expect(result).toEqual({ id: 'inv-1' });
    });

    it('returns null when the invitation cannot be found (resolveToNull)', async () => {
      const loader = makeLoader(null);

      const result = await resolver.invitation(
        { invitationID: 'missing' } as any,
        loader as any
      );

      expect(result).toBeNull();
    });
  });
});

import { IProfile } from '@domain/common/profile/profile.interface';
import { describe, expect, it, vi } from 'vitest';
import { AccountHostedInnovationHubResolverFields } from './account.hosted.innovation.hub.resolver.fields';

describe('AccountHostedInnovationHubResolverFields', () => {
  it('resolves the card profile through the loader keyed by the Innovation Hub id', async () => {
    const resolver = new AccountHostedInnovationHubResolverFields();
    const profile = { id: 'profile-1' } as IProfile;
    const loader = { load: vi.fn().mockResolvedValue(profile) };

    const result = await resolver.profile(
      { id: 'hub-1', nameID: 'hub-one' },
      loader as any
    );

    expect(loader.load).toHaveBeenCalledWith('hub-1');
    expect(result).toBe(profile);
  });

  it('exposes no field resolver other than profile — the card stays closed', () => {
    expect(
      Object.getOwnPropertyNames(
        AccountHostedInnovationHubResolverFields.prototype
      ).sort()
    ).toEqual(['constructor', 'profile']);
  });
});

import { IProfile } from '@domain/common/profile/profile.interface';
import { describe, expect, it, vi } from 'vitest';
import { AccountHostedResourcesResolverFields } from './account.hosted.resources.resolver.fields';

describe('AccountHostedResourcesResolverFields', () => {
  it('resolves the card profile through the loader keyed by the Virtual Contributor id', async () => {
    const resolver = new AccountHostedResourcesResolverFields();
    const profile = { id: 'profile-1' } as IProfile;
    const loader = { load: vi.fn().mockResolvedValue(profile) };

    const result = await resolver.profile({ id: 'vc-1' }, loader as any);

    expect(loader.load).toHaveBeenCalledWith('vc-1');
    expect(result).toBe(profile);
  });

  it('exposes no field resolver other than profile — the card stays closed', () => {
    expect(
      Object.getOwnPropertyNames(
        AccountHostedResourcesResolverFields.prototype
      ).sort()
    ).toEqual(['constructor', 'profile']);
  });
});

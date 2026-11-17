import { describe, expect, it, vi } from 'vitest';
import { PlatformAuthorizationPolicyLoaderCreator } from './platform.authorization.policy.loader.creator';

describe('PlatformAuthorizationPolicyLoaderCreator', () => {
  const policy = { id: 'platform-policy' } as any;

  const makeCreator = () => {
    const platformAuthorizationPolicyService = {
      getPlatformAuthorizationPolicy: vi.fn().mockResolvedValue(policy),
    };
    const creator = new PlatformAuthorizationPolicyLoaderCreator(
      platformAuthorizationPolicyService as any
    );
    return { creator, platformAuthorizationPolicyService };
  };

  it('resolves the platform policy once for a whole list of rows in one request', async () => {
    const { creator, platformAuthorizationPolicyService } = makeCreator();
    const loader = creator.create();

    const results = await Promise.all(
      Array.from({ length: 50 }, () =>
        loader.load(PlatformAuthorizationPolicyLoaderCreator.KEY)
      )
    );
    // A later, separately-ticked load in the same request is served from cache.
    const later = await loader.load(
      PlatformAuthorizationPolicyLoaderCreator.KEY
    );

    expect(
      platformAuthorizationPolicyService.getPlatformAuthorizationPolicy
    ).toHaveBeenCalledTimes(1);
    expect(results.every(r => r === policy)).toBe(true);
    expect(later).toBe(policy);
  });

  it('a new request (new loader) looks the policy up again', async () => {
    const { creator, platformAuthorizationPolicyService } = makeCreator();

    await creator.create().load(PlatformAuthorizationPolicyLoaderCreator.KEY);
    await creator.create().load(PlatformAuthorizationPolicyLoaderCreator.KEY);

    expect(
      platformAuthorizationPolicyService.getPlatformAuthorizationPolicy
    ).toHaveBeenCalledTimes(2);
  });

  it('honours cache: false (subscription contexts) by re-resolving per load', async () => {
    const { creator, platformAuthorizationPolicyService } = makeCreator();
    const loader = creator.create({ cache: false } as any);

    await loader.load(PlatformAuthorizationPolicyLoaderCreator.KEY);
    await loader.load(PlatformAuthorizationPolicyLoaderCreator.KEY);

    expect(
      platformAuthorizationPolicyService.getPlatformAuthorizationPolicy
    ).toHaveBeenCalledTimes(2);
  });
});

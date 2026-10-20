import { ForbiddenException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DevicePushTokenResolverMutations } from './device.push.token.resolver.mutations';

/**
 * The resolver's own two obligations. The VALIDATION-rejection cases are NOT
 * here: a resolver unit spec calls the method directly, so Nest's validation
 * pipe — the only consumer of the opt-in allowlist — is never in the call path
 * and the DTO decorators never execute. That proof lives in
 * src/core/validation/handlers/base/base.handler.push.spec.ts.
 */
describe('DevicePushTokenResolverMutations', () => {
  let resolver: DevicePushTokenResolverMutations;
  let service: {
    register: ReturnType<typeof vi.fn>;
    unregister: ReturnType<typeof vi.fn>;
  };

  const actor = (actorID: string) => {
    const context = new ActorContext();
    context.actorID = actorID;
    context.isAnonymous = actorID === '';
    return context;
  };

  beforeEach(() => {
    service = { register: vi.fn(), unregister: vi.fn() };
    resolver = new DevicePushTokenResolverMutations(service as any);
  });

  it('refuses an unauthenticated actor on BOTH mutations and never calls the service', async () => {
    await expect(
      resolver.registerDevicePushToken(actor(''), {
        token: 'tok-1',
        platform: 'ios',
      })
    ).rejects.toThrow(ForbiddenException);
    await expect(
      resolver.unregisterDevicePushToken(actor(''), { token: 'tok-1' })
    ).rejects.toThrow(ForbiddenException);

    expect(service.register).not.toHaveBeenCalled();
    expect(service.unregister).not.toHaveBeenCalled();
  });

  it('passes the CALLER’s id to the service, so the row cannot be bound to anyone else', async () => {
    const input = { token: 'tok-1', platform: 'android' };

    await expect(
      resolver.registerDevicePushToken(actor('user-1'), input)
    ).resolves.toBe(true);
    expect(service.register).toHaveBeenCalledWith('user-1', input);

    await expect(
      resolver.unregisterDevicePushToken(actor('user-1'), { token: 'tok-1' })
    ).resolves.toBe(true);
    expect(service.unregister).toHaveBeenCalledWith('user-1', 'tok-1');
  });
});

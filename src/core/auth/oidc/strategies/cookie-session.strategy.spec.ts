import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import type { AlkemioSessionPayload } from '../session-store.redis';
import { SESSION_STORE_HANDLE } from './cookie-session.errors';
import { CookieSessionStrategy } from './cookie-session.strategy';

describe('CookieSessionStrategy session-lifetime stamping', () => {
  const NOW_S = 1_800_000_000;

  const buildPayload = (): AlkemioSessionPayload => ({
    access_token: 'at',
    id_token: 'idt',
    refresh_token: 'rt',
    expires_at: NOW_S + 600,
    absolute_expires_at: NOW_S + 2_592_000, // +30d, epoch-seconds
    sub: 'kratos-identity-id',
    alkemio_actor_id: 'actor-1',
    refresh_failure_count: 0,
    refresh_failure_streak_started_at: null,
    created_at: NOW_S - 3600, // 1h ago, epoch-seconds
    client_id: 'alkemio-web',
  });

  const buildStrategy = async (payload: AlkemioSessionPayload | null) => {
    // The instance createActorContext resolves — stands in for the shared
    // actorID-keyed cached ActorContext.
    const cachedContext = new ActorContext();
    cachedContext.actorID = 'actor-1';
    cachedContext.isAnonymous = false;
    cachedContext.credentials = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CookieSessionStrategy,
        {
          provide: SESSION_STORE_HANDLE,
          useValue: {
            get: vi.fn().mockResolvedValue(payload),
            destroy: vi.fn(),
            markTerminated: vi.fn(),
          },
        },
        {
          provide: AuthenticationService,
          useValue: {
            createActorContext: vi.fn().mockResolvedValue(cachedContext),
          },
        },
        {
          provide: ActorContextService,
          useValue: {
            createAnonymous: vi
              .fn()
              .mockReturnValue(
                Object.assign(new ActorContext(), { isAnonymous: true })
              ),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: vi.fn().mockReturnValue('alkemio_session') },
        },
      ],
    }).compile();

    return {
      strategy: module.get(CookieSessionStrategy),
      cachedContext,
    };
  };

  const request = { sessionID: 'sid-1', cookies: {} } as any;

  it('stamps expiry / absoluteExpiry / issuedAt from the payload, converted to ms', async () => {
    const payload = buildPayload();
    const { strategy } = await buildStrategy(payload);

    const result = await strategy.validate(request);

    expect(result?.expiry).toBe(payload.expires_at * 1000);
    expect(result?.absoluteExpiry).toBe(payload.absolute_expires_at * 1000);
    expect(result?.issuedAt).toBe(payload.created_at * 1000);
    expect(result?.actorID).toBe('actor-1');
    expect(result?.isAnonymous).toBe(false);
  });

  it('never mutates the shared cached ActorContext (per-session values on a per-actor cache race)', async () => {
    const { strategy, cachedContext } = await buildStrategy(buildPayload());

    const result = await strategy.validate(request);

    expect(result).not.toBe(cachedContext);
    expect(cachedContext.expiry).toBeUndefined();
    expect(cachedContext.absoluteExpiry).toBeUndefined();
    expect(cachedContext.issuedAt).toBeUndefined();
  });

  it('does not stamp the anonymous fall-through (payload without alkemio_actor_id)', async () => {
    const payload = { ...buildPayload(), alkemio_actor_id: null };
    const { strategy } = await buildStrategy(payload);

    const result = await strategy.validate(request);

    expect(result?.isAnonymous).toBe(true);
    expect(result?.expiry).toBeUndefined();
    expect(result?.issuedAt).toBeUndefined();
  });

  it('returns null (anonymous fall-through) when no Redis payload exists', async () => {
    const { strategy } = await buildStrategy(null);

    const result = await strategy.validate(request);

    expect(result).toBeNull();
  });
});

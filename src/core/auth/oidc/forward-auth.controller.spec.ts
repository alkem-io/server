import { ActorContext } from '@core/actor-context/actor.context';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { type Mocked, vi } from 'vitest';
import {
  ANONYMOUS_ACTOR_ID,
  GUEST_ACTOR_ID,
  HEADER_ACTOR_ID,
} from './constants';
import { ForwardAuthController } from './forward-auth.controller';
import {
  ForwardAuthResolverService,
  SessionStoreUnavailableError,
} from './forward-auth.resolver.service';

describe('ForwardAuthController', () => {
  let controller: ForwardAuthController;
  let resolver: Mocked<ForwardAuthResolverService>;

  const buildRes = () =>
    ({
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      end: vi.fn(),
    }) as unknown as Response & {
      setHeader: ReturnType<typeof vi.fn>;
      status: ReturnType<typeof vi.fn>;
      end: ReturnType<typeof vi.fn>;
    };

  const actor = (values: Partial<ActorContext>) =>
    Object.assign(new ActorContext(), values);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForwardAuthController,
        {
          provide: ForwardAuthResolverService,
          useValue: { resolveActorContext: vi.fn() },
        },
      ],
    }).compile();

    controller = module.get(ForwardAuthController);
    resolver = module.get(ForwardAuthResolverService);
  });

  it('pins the named-guest wire identity', () => {
    expect(GUEST_ACTOR_ID).toBe('00000000-0000-0000-0000-000000000001');
  });

  it.each([
    {
      source: 'forwarded URI',
      direct: undefined,
      headers: {
        'x-forwarded-uri':
          '/collab/whiteboard-1?type=whiteboard&guestName=Jos%C3%A9%20M%C3%BCller',
      },
    },
    {
      source: 'encoded header',
      direct: undefined,
      headers: {
        'x-guest-name': Buffer.from('José Müller', 'utf8').toString('base64'),
      },
    },
    { source: 'direct query', direct: 'José Müller', headers: {} },
  ])('emits the guest identity from $source', async ({ direct, headers }) => {
    resolver.resolveActorContext.mockResolvedValue(
      actor({ isGuest: true, guestName: 'José Müller' })
    );
    const res = buildRes();

    await controller.resolve(direct, { headers } as unknown as Request, res);

    expect(resolver.resolveActorContext).toHaveBeenCalledWith(
      expect.anything(),
      'José Müller'
    );
    expect(res.setHeader).toHaveBeenCalledWith(HEADER_ACTOR_ID, GUEST_ACTOR_ID);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it.each([
    { source: 'blank direct query', direct: '   ', headers: {} },
    {
      source: 'malformed encoded header',
      direct: undefined,
      headers: { 'x-guest-name': 'not-base64!!!' },
    },
    {
      source: 'malformed forwarded URI',
      direct: undefined,
      headers: { 'x-forwarded-uri': '/collab/id?guestName=%E0%A4%A' },
    },
    {
      source: 'repeated direct query',
      direct: ['Alice', 'Mallory'],
      headers: {},
    },
  ])('keeps $source anonymous', async ({ direct, headers }) => {
    resolver.resolveActorContext.mockResolvedValue(
      actor({ isAnonymous: true })
    );
    const res = buildRes();

    await controller.resolve(direct, { headers } as unknown as Request, res);

    expect(resolver.resolveActorContext).toHaveBeenCalledWith(
      expect.anything(),
      undefined
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      HEADER_ACTOR_ID,
      ANONYMOUS_ACTOR_ID
    );
  });

  it('keeps an authenticated actor authoritative when guest metadata exists', async () => {
    resolver.resolveActorContext.mockResolvedValue(
      actor({ actorID: 'user-1' })
    );
    const res = buildRes();

    await controller.resolve(
      'Mallory',
      { headers: {} } as unknown as Request,
      res
    );

    expect(res.setHeader).toHaveBeenCalledWith(HEADER_ACTOR_ID, 'user-1');
  });

  it('returns 503 without an actor header when the session store is unavailable', async () => {
    resolver.resolveActorContext.mockRejectedValue(
      new SessionStoreUnavailableError()
    );
    const res = buildRes();

    await controller.resolve(undefined, { headers: {} } as Request, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.setHeader).not.toHaveBeenCalledWith(
      HEADER_ACTOR_ID,
      expect.anything()
    );
  });
});

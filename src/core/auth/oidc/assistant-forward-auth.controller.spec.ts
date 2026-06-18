import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import type { Request, Response } from 'express';
import { type Mocked, vi } from 'vitest';
import { AssistantForwardAuthController } from './assistant-forward-auth.controller';
import { ANONYMOUS_ACTOR_ID, HEADER_ACTOR_ID } from './constants';
import {
  ForwardAuthResolverService,
  SessionStoreUnavailableError,
} from './forward-auth.resolver.service';

/**
 * 004-web-ai-assistant (FR-027, T037d): the assistant-edge privilege gate.
 * Verifies a request whose acting user lacks ACCESS_VIRTUAL_ASSISTANT is
 * refused (403) before assistant-service is reached, while a privileged user
 * is admitted (200 + actor header).
 */
describe('AssistantForwardAuthController', () => {
  let controller: AssistantForwardAuthController;
  let resolver: Mocked<ForwardAuthResolverService>;
  let authorizationService: Mocked<AuthorizationService>;

  const buildRes = () => {
    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      end: vi.fn(),
    };
    return res as unknown as Response & {
      setHeader: ReturnType<typeof vi.fn>;
      status: ReturnType<typeof vi.fn>;
      end: ReturnType<typeof vi.fn>;
    };
  };

  const actorWith = (actorID: string, isAnonymous = false): ActorContext => {
    const ctx = new ActorContext();
    ctx.actorID = actorID;
    ctx.isAnonymous = isAnonymous;
    return ctx;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssistantForwardAuthController,
        {
          provide: ForwardAuthResolverService,
          useValue: { resolveActorContext: vi.fn() },
        },
        {
          provide: AuthorizationService,
          useValue: { isAccessGranted: vi.fn() },
        },
        {
          provide: PlatformAuthorizationPolicyService,
          useValue: {
            getPlatformAuthorizationPolicy: vi
              .fn()
              .mockResolvedValue({ id: 'platform-auth' }),
          },
        },
      ],
    }).compile();

    controller = module.get(AssistantForwardAuthController);
    resolver = module.get(ForwardAuthResolverService);
    authorizationService = module.get(AuthorizationService);
  });

  it('admits a privileged user: 200 + stamps the actor header', async () => {
    resolver.resolveActorContext.mockResolvedValue(actorWith('user-1'));
    authorizationService.isAccessGranted.mockReturnValue(true);
    const res = buildRes();

    await controller.resolve(undefined, {} as Request, res);

    expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
      expect.objectContaining({ actorID: 'user-1' }),
      { id: 'platform-auth' },
      AuthorizationPrivilege.ACCESS_VIRTUAL_ASSISTANT
    );
    expect(res.setHeader).toHaveBeenCalledWith(HEADER_ACTOR_ID, 'user-1');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('refuses an unprivileged user with 403 before assistant-service', async () => {
    resolver.resolveActorContext.mockResolvedValue(actorWith('user-2'));
    authorizationService.isAccessGranted.mockReturnValue(false);
    const res = buildRes();

    await controller.resolve(undefined, {} as Request, res);

    expect(res.status).toHaveBeenCalledWith(403);
    // Must NOT stamp the actor header on refusal (request never proceeds).
    expect(res.setHeader).not.toHaveBeenCalledWith(
      HEADER_ACTOR_ID,
      expect.anything()
    );
  });

  it('refuses an anonymous caller (never holds the privilege) with 403', async () => {
    resolver.resolveActorContext.mockResolvedValue(
      actorWith(ANONYMOUS_ACTOR_ID, true)
    );
    authorizationService.isAccessGranted.mockReturnValue(false);
    const res = buildRes();

    await controller.resolve(undefined, {} as Request, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 503 when the BFF session store is unavailable', async () => {
    resolver.resolveActorContext.mockRejectedValue(
      new SessionStoreUnavailableError()
    );
    const res = buildRes();

    await controller.resolve(undefined, {} as Request, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(authorizationService.isAccessGranted).not.toHaveBeenCalled();
  });
});

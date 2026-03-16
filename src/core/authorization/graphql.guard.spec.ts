import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { GraphqlGuard } from './graphql.guard';

describe('GraphqlGuard', () => {
  let guard: GraphqlGuard;
  let reflector: Reflector;
  let mockAuthorizationService: any;
  let mockActorContextService: any;

  beforeEach(async () => {
    vi.restoreAllMocks();

    mockAuthorizationService = {
      grantAccessOrFail: vi.fn().mockReturnValue(true),
    };

    mockActorContextService = {
      createAnonymous: vi
        .fn()
        .mockReturnValue(
          Object.assign(new ActorContext(), { isAnonymous: true })
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphqlGuard,
        MockCacheManager,
        MockWinstonProvider,
        {
          provide: AuthorizationService,
          useValue: mockAuthorizationService,
        },
        {
          provide: ActorContextService,
          useValue: mockActorContextService,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    guard = module.get(GraphqlGuard);
    reflector = module.get(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  function makeContext(
    privilege: AuthorizationPrivilege | undefined,
    fieldParent: any = {},
    user?: ActorContext
  ) {
    vi.spyOn(reflector, 'get').mockReturnValue(privilege as any);

    const context = {
      getHandler: vi.fn(),
    } as any;

    vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getInfo: () => ({ fieldName: 'testField' }),
      getRoot: () => fieldParent,
      getContext: () => ({ req: { user } }),
    } as any);

    return context;
  }

  describe('canActivate', () => {
    it('returns true when no privilege decorator is set', () => {
      const context = makeContext(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(
        mockAuthorizationService.grantAccessOrFail
      ).not.toHaveBeenCalled();
    });

    it('checks privilege against parent authorization when privilege is set', () => {
      const actorCtx = new ActorContext();
      actorCtx.actorID = 'user-1';
      const authorization = { id: 'auth-1' };
      const fieldParent = { authorization, constructor: { name: 'Space' } };
      const context = makeContext(
        AuthorizationPrivilege.READ,
        fieldParent,
        actorCtx
      );

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(
        mockAuthorizationService.grantAccessOrFail
      ).toHaveBeenCalledWith(
        actorCtx,
        authorization,
        AuthorizationPrivilege.READ,
        'Space.testField'
      );
    });

    it('uses anonymous actor context when req.user is not set', () => {
      const authorization = { id: 'auth-2' };
      const fieldParent = { authorization, constructor: { name: 'Profile' } };
      const context = makeContext(
        AuthorizationPrivilege.READ,
        fieldParent,
        undefined
      );

      guard.canActivate(context);

      expect(mockActorContextService.createAnonymous).toHaveBeenCalledOnce();
      expect(
        mockAuthorizationService.grantAccessOrFail
      ).toHaveBeenCalledWith(
        expect.objectContaining({ isAnonymous: true }),
        authorization,
        AuthorizationPrivilege.READ,
        'Profile.testField'
      );
    });

    it('propagates exception from grantAccessOrFail', () => {
      const actorCtx = new ActorContext();
      actorCtx.actorID = 'user-1';
      const fieldParent = {
        authorization: { id: 'auth-3' },
        constructor: { name: 'Callout' },
      };
      const context = makeContext(
        AuthorizationPrivilege.UPDATE,
        fieldParent,
        actorCtx
      );

      mockAuthorizationService.grantAccessOrFail.mockImplementation(() => {
        throw new Error('Access denied');
      });

      expect(() => guard.canActivate(context)).toThrow('Access denied');
    });
  });
});

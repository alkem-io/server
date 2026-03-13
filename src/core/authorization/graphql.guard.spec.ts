import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
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
  let mockEntityManager: any;

  beforeEach(async () => {
    mockEntityManager = {
      findOne: vi.fn().mockResolvedValue(null),
    };

    mockAuthorizationService = {
      logActorContext: vi.fn(),
      grantAccessOrFail: vi.fn().mockReturnValue(true),
      isAccessGranted: vi.fn().mockReturnValue(true),
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
          provide: getEntityManagerToken('default'),
          useValue: mockEntityManager,
        },
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

  describe('getRequest', () => {
    it('returns req from graphql context for graphql type', () => {
      const mockReq = { headers: { authorization: 'Bearer token' } };
      const mockContext = {
        getType: vi.fn().mockReturnValue('graphql'),
      } as any;

      vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
        getContext: () => ({ req: mockReq }),
      } as any);

      const result = guard.getRequest(mockContext);
      expect(result).toBe(mockReq);
    });

    it('returns websocket headers when connectionParams present', () => {
      const mockContext = {
        getType: vi.fn().mockReturnValue('graphql'),
      } as any;

      vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
        getContext: () => ({
          websocketHeader: {
            connectionParams: { Authorization: 'Bearer ws-token' },
          },
        }),
      } as any);

      const result = guard.getRequest(mockContext);
      expect(result.headers.Authorization).toBe('Bearer ws-token');
    });

    it('returns HTTP request for non-graphql type', () => {
      const mockReq = { headers: {} };
      const mockContext = {
        getType: vi.fn().mockReturnValue('http'),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(mockReq),
        }),
      } as any;

      const result = guard.getRequest(mockContext);
      expect(result).toBe(mockReq);
    });
  });

  describe('handleRequest', () => {
    function makeContext(
      privilege?: AuthorizationPrivilege,
      fieldParent: any = {}
    ) {
      vi.spyOn(reflector, 'get').mockReturnValue(privilege as any);

      const context = {
        getHandler: vi.fn(),
      } as any;

      vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
        getInfo: () => ({ fieldName: 'testField' }),
        getRoot: () => fieldParent,
        getContext: () => ({}),
      } as any);

      return context;
    }

    it('throws AuthenticationException when err is provided', () => {
      const context = makeContext();
      expect(() =>
        guard.handleRequest(new Error('auth failed'), null, null, context, null)
      ).toThrow('auth failed');
    });

    it('returns actorContext when no error and no privilege required', () => {
      const context = makeContext(undefined);
      const actorCtx = new ActorContext();
      actorCtx.actorID = 'user-1';

      const result = guard.handleRequest(null, actorCtx, null, context, null);

      expect(result).toBe(actorCtx);
      expect(mockAuthorizationService.logActorContext).toHaveBeenCalledWith(
        actorCtx
      );
    });

    it('creates anonymous context when actorContext is falsy', () => {
      const context = makeContext(undefined);

      const result = guard.handleRequest(null, null, null, context, null);

      expect(result.isAnonymous).toBe(true);
      expect(mockActorContextService.createAnonymous).toHaveBeenCalledOnce();
    });

    it('executes authorization rule when privilege is set and authorization exists', () => {
      const fieldParent = { authorization: { id: 'auth-1' } };
      const context = makeContext(AuthorizationPrivilege.READ, fieldParent);

      const actorCtx = new ActorContext();
      actorCtx.actorID = 'user-1';

      const result = guard.handleRequest(null, actorCtx, null, context, null);

      expect(result).toBe(actorCtx);
    });

    it('loads authorization from DB when authorizationId is set but authorization is missing', () => {
      const fieldParent = {
        authorizationId: 'auth-123',
        authorization: undefined,
      };
      const context = makeContext(AuthorizationPrivilege.READ, fieldParent);

      const actorCtx = new ActorContext();
      actorCtx.actorID = 'user-1';

      mockEntityManager.findOne.mockResolvedValue({ id: 'auth-123' });

      const result = guard.handleRequest(null, actorCtx, null, context, null);

      expect(result).toBe(actorCtx);
    });
  });
});

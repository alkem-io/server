import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { NonInteractiveLoginAuditService } from '@core/auth/non-interactive-login/non-interactive-login.audit';
import { NonInteractiveLoginConfig } from '@core/auth/non-interactive-login/non-interactive-login.config';
import { NonInteractiveLoginStrategy } from '@core/auth/non-interactive-login/non-interactive-login.strategy';
import {
  BEARER_AUD_ALLOW_LIST_HANDLE,
  BEARER_JWKS_HANDLE,
  HYDRA_ISSUER_URL_HANDLE,
  HydraBearerStrategy,
  HydraBearerValidator,
} from '@core/auth/oidc/strategies/hydra-bearer.strategy';
import {
  AUTH_STRATEGY_NON_INTERACTIVE_LOGIN,
  AUTH_STRATEGY_OIDC_COOKIE_SESSION,
  AUTH_STRATEGY_OIDC_HYDRA_BEARER,
} from '@core/auth/oidc/strategies/strategy.names';
import { SecondFactorPolicyService } from '@core/auth/second-factor/second-factor.policy.service';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { HttpExceptionFilter } from '@core/error-handling/http.exception.filter';
import { AuthInterceptor } from '@core/interceptors/auth.interceptor';
import { VirtualAssistantService } from '@domain/community/virtual-assistant/virtual.assistant.service';
import { INestApplication, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PassportStrategy } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import passport from 'passport';
import { Strategy } from 'passport-custom';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { McpApiKeyService } from './auth/mcp-api-key.service';
import {
  AUTH_STRATEGY_MCP_API_KEY,
  McpApiKeyStrategy,
} from './auth/mcp-api-key.strategy';
import { McpAuthGuard } from './auth/mcp-auth.guard';
import {
  AUTH_STRATEGY_MCP_DELEGATION,
  McpDelegationStrategy,
} from './auth/mcp-delegation.strategy';
import { AssistantCapabilityGateService } from './capabilities/assistant.capability.gate.service';
import { MCP_CONFIG_DEFAULTS } from './mcp-server.config';
import { McpServerController } from './mcp-server.controller';
import { McpServerService } from './mcp-server.service';
import { ResourceRegistry } from './resources/resource.registry';
import { ToolRegistry } from './tools/tool.registry';

/**
 * workspace#038 (R-038-2 / R-038-8, US3-AS3): the three former
 * `/rest/mcp/api-keys` lifecycle handlers were DELETED, not deprecated —
 * they were internet-reachable and guarded only by `McpAuthGuard`, so a
 * leaked MCP key could mint further MCP keys. This spec asserts the closure:
 * none of the three verbs resolve to a route any more. Nest's router 404s
 * before `McpAuthGuard` (or anything else) runs, since no handler is
 * registered for the sub-path.
 */
describe('McpServerController — deleted /rest/mcp/api-keys surface (US3-AS3)', () => {
  let app: INestApplication;
  // The controller hands the raw ServerResponse to the service and writes
  // nothing itself, so the mock must end the response or the request hangs.
  const mcpServerService = {
    handleRequest: vi.fn(async (_req: unknown, res: any) => {
      res.statusCode = 200;
      res.end();
    }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [McpServerController],
      providers: [
        MockWinstonProvider,
        {
          provide: McpServerService,
          useValue: mcpServerService,
        },
      ],
    })
      .overrideGuard(McpAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // Positive control. Without it, all three 404 assertions below would still
  // pass if the controller were mounted under a different base path, or not
  // mounted at all — proving nothing about the deleted lifecycle surface.
  // This anchors '/rest/mcp' as live before we assert its sub-path is gone.
  it('POST /rest/mcp still resolves to the MCP handler', async () => {
    await request(app.getHttpServer()).post('/rest/mcp').send({});
    expect(mcpServerService.handleRequest).toHaveBeenCalled();
  });

  it('POST /rest/mcp/api-keys returns 404', async () => {
    await request(app.getHttpServer())
      .post('/rest/mcp/api-keys')
      .send({ name: 'x' })
      .expect(404);
  });

  it('GET /rest/mcp/api-keys returns 404', async () => {
    await request(app.getHttpServer()).get('/rest/mcp/api-keys').expect(404);
  });

  it('DELETE /rest/mcp/api-keys/:id returns 404', async () => {
    await request(app.getHttpServer())
      .delete('/rest/mcp/api-keys/some-id')
      .expect(404);
  });
});

// Stands in for the cookie-session strategy, whose collaborators (session
// store, Redis) cannot be stubbed inertly. It never authenticates.
@Injectable()
class InertCookieSessionStrategy extends PassportStrategy(
  Strategy,
  AUTH_STRATEGY_OIDC_COOKIE_SESSION
) {
  validate(): null {
    return null;
  }
}

/**
 * Session admission through what runs in front of the MCP service in the
 * application: the real McpAuthGuard, AuthInterceptor, HttpExceptionFilter,
 * credential strategies and McpServerService. Only their collaborators are
 * stubbed, and no stub authenticates anybody: the one admitted request goes
 * through the real key strategy with the one key the key service accepts.
 */
describe('McpServerController — session admission over HTTP', () => {
  const VALID_KEY = 'mcp_valid-test-key';
  const INVALID_KEY = 'mcp_not-a-real-key';
  let app: INestApplication;
  let service: McpServerService;
  let mcpEnabled = true;

  const configService = {
    get: vi.fn((key: string) => {
      if (key === 'mcp.enabled') return mcpEnabled;
      if (key === 'mcp.api_key_enabled') return true;
      if (key.startsWith('mcp.')) {
        return key
          .slice('mcp.'.length)
          .split('.')
          .reduce<any>((value, part) => value?.[part], MCP_CONFIG_DEFAULTS);
      }
      return undefined;
    }),
  };

  const mcpApiKeyService = {
    validateApiKey: vi.fn(async (key: string) =>
      key === VALID_KEY
        ? { id: 'key-1', userId: 'user-1', scopes: [{ operations: ['tools'] }] }
        : null
    ),
    updateLastUsed: vi.fn().mockResolvedValue(undefined),
    isKeyUsable: vi.fn().mockResolvedValue(true),
  };

  const actorContextService = {
    createAnonymous: vi.fn(() =>
      Object.assign(new ActorContext(), {
        actorID: '',
        isAnonymous: true,
        isGuest: false,
        credentials: [],
      })
    ),
    createGuest: vi.fn((guestName: string) =>
      Object.assign(new ActorContext(), {
        actorID: '',
        isAnonymous: false,
        isGuest: true,
        guestName,
        credentials: [],
      })
    ),
    buildForUser: vi.fn(async (userId: string) =>
      Object.assign(new ActorContext(), {
        actorID: userId,
        isAnonymous: false,
        credentials: [],
      })
    ),
    buildForActor: vi.fn(),
  };

  const post = (body: unknown, headers: Record<string, string> = {}) => {
    let req = request(app.getHttpServer())
      .post('/rest/mcp')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json, text/event-stream');
    for (const [name, value] of Object.entries(headers)) {
      req = req.set(name, value);
    }
    return req.send(JSON.stringify(body));
  };

  const initialize = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'test', version: '1.0.0' },
    },
  };

  const expectRefused = (res: request.Response) => {
    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toBe('Bearer');
    expect(res.headers['mcp-session-id']).toBeUndefined();
    const body = JSON.parse(res.text);
    expect(body.error.code).toBe(-32001);
    expect(body).not.toHaveProperty('result');
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [McpServerController],
      providers: [
        MockWinstonProvider,
        { provide: APP_INTERCEPTOR, useClass: AuthInterceptor },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
        McpAuthGuard,
        McpDelegationStrategy,
        McpApiKeyStrategy,
        NonInteractiveLoginStrategy,
        HydraBearerStrategy,
        HydraBearerValidator,
        InertCookieSessionStrategy,
        McpServerService,
        { provide: ConfigService, useValue: configService },
        { provide: McpApiKeyService, useValue: mcpApiKeyService },
        { provide: ActorContextService, useValue: actorContextService },
        {
          provide: BEARER_JWKS_HANDLE,
          useValue: () => {
            throw new Error('no signing keys in this test');
          },
        },
        { provide: BEARER_AUD_ALLOW_LIST_HANDLE, useValue: [] },
        {
          provide: HYDRA_ISSUER_URL_HANDLE,
          useValue: 'https://issuer.invalid/',
        },
        {
          provide: NonInteractiveLoginConfig,
          useValue: { enabled: false, secretKey: null },
        },
        { provide: NonInteractiveLoginAuditService, useValue: {} },
        { provide: AuthenticationService, useValue: {} },
        { provide: SecondFactorPolicyService, useValue: {} },
        { provide: VirtualAssistantService, useValue: {} },
        { provide: ToolRegistry, useValue: {} },
        { provide: ResourceRegistry, useValue: {} },
        { provide: AuthorizationService, useValue: {} },
        { provide: AssistantCapabilityGateService, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    service = moduleRef.get(McpServerService);
  });

  afterAll(async () => {
    await service?.closeAllSessions();
    await app?.close();
    for (const name of [
      AUTH_STRATEGY_MCP_DELEGATION,
      AUTH_STRATEGY_MCP_API_KEY,
      AUTH_STRATEGY_OIDC_COOKIE_SESSION,
      AUTH_STRATEGY_NON_INTERACTIVE_LOGIN,
      AUTH_STRATEGY_OIDC_HYDRA_BEARER,
    ]) {
      passport.unuse(name);
    }
  });

  it('opens a session for a handshake with a valid key', async () => {
    const res = await post(initialize, {
      Authorization: `Bearer ${VALID_KEY}`,
    });
    expect(res.status).toBe(200);
    expect(res.headers['mcp-session-id']).toEqual(expect.any(String));
    expect(res.headers['mcp-session-id']).not.toBe('');
    expect(mcpApiKeyService.validateApiKey).toHaveBeenCalledWith(VALID_KEY);
  });

  it('refuses a handshake without credentials', async () => {
    expectRefused(await post(initialize));
  });

  it('refuses a tool call without credentials and without a session', async () => {
    expectRefused(
      await post({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'list_whiteboards', arguments: {} },
      })
    );
  });

  it('refuses a handshake with a key the key service rejects, in the key header', async () => {
    expectRefused(await post(initialize, { 'X-MCP-API-Key': INVALID_KEY }));
    expect(mcpApiKeyService.validateApiKey).toHaveBeenCalledWith(INVALID_KEY);
  });

  it('refuses a handshake that only names a guest', async () => {
    expectRefused(await post(initialize, { 'x-guest-name': 'guest' }));
  });

  it('answers 401 from request authentication for a rejected key sent as a bearer token', async () => {
    const res = await post(initialize, {
      Authorization: `Bearer ${INVALID_KEY}`,
    });
    expect(res.status).toBe(401);
    expect(res.headers['mcp-session-id']).toBeUndefined();
    expect(JSON.parse(res.text)).not.toHaveProperty('result');
    expect(mcpApiKeyService.validateApiKey).toHaveBeenCalledWith(INVALID_KEY);
  });

  it('answers 503 without a challenge when the endpoint is switched off', async () => {
    mcpEnabled = false;
    try {
      const res = await post(initialize);
      expect(res.status).toBe(503);
      expect(res.headers['www-authenticate']).toBeUndefined();
    } finally {
      mcpEnabled = true;
    }
  });
});

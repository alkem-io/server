import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { vi } from 'vitest';
import { McpServerService } from './mcp-server.service';

/**
 * Guards the resource-read authorization gate (R1): the MCP resource surface
 * must enforce the entity's read policy before returning content, not just the
 * API-key scope.
 */
describe('McpServerService.readResource — authorization', () => {
  const uri = 'alkemio://whiteboards/wb-1';
  const policy = { id: 'auth-policy-1' };

  const setup = (opts: { noProvider?: boolean; granted?: boolean } = {}) => {
    const provider = {
      getResourceDefinitions: () => [],
      matches: () => true,
      getAuthorizationPolicy: vi.fn().mockResolvedValue(policy),
      read: vi.fn().mockResolvedValue({
        contents: [{ uri, mimeType: 'application/json', text: '{"ok":true}' }],
      }),
    };
    const resourceRegistry = {
      getProvider: vi
        .fn()
        .mockReturnValue(opts.noProvider ? undefined : provider),
    };
    const authorizationService = {
      isAccessGranted: vi.fn().mockReturnValue(opts.granted ?? true),
    };
    const logger = { warn: vi.fn(), verbose: vi.fn(), error: vi.fn() };
    const capabilityGateService = {
      checkToolAllowed: vi.fn().mockResolvedValue(null),
    };
    const service = new McpServerService(
      {} as any,
      {} as any,
      resourceRegistry as any,
      authorizationService as any,
      capabilityGateService as any,
      logger as any,
      {} as any
    );
    return { service, provider, authorizationService, logger };
  };

  it('throws "Resource not found" when no provider matches the URI', async () => {
    const { service } = setup({ noProvider: true });
    await expect(service.readResource(uri, new ActorContext())).rejects.toThrow(
      /Resource not found/
    );
  });

  it('denies the read when READ access is not granted, and never calls read()', async () => {
    const { service, provider, logger } = setup({ granted: false });
    const actor = new ActorContext();
    await expect(service.readResource(uri, actor)).rejects.toThrow(
      /Access denied/
    );
    expect(provider.read).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('checks READ on the provider policy and returns content when granted', async () => {
    const { service, provider, authorizationService } = setup({
      granted: true,
    });
    const actor = new ActorContext();
    const result = await service.readResource(uri, actor);
    expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
      actor,
      policy,
      AuthorizationPrivilege.READ
    );
    expect(provider.read).toHaveBeenCalledWith(uri, actor);
    expect(result.contents[0].text).toBe('{"ok":true}');
  });
});

/**
 * workspace#038, FR-012/FR-013/FR-014, C-04: session-scoped key revalidation.
 * The service's own private `sessions` map is manipulated directly to seed a
 * pre-established session — this is the same technique any real session
 * reaches: `handleRequest` reads/writes `this.sessions`, and there is no
 * public seam to construct a session without driving the real MCP SDK
 * transport. `configService.get('mcp.enabled', ...)` must return true for
 * `handleRequest` to proceed past its top-of-function guard.
 */
describe('McpServerService.handleRequest — session revalidation (workspace#038)', () => {
  const SESSION_ID = 'session-1';
  const KEY_ID = 'key-1';

  const setup = (opts: { isKeyUsable?: boolean } = {}) => {
    const configService = {
      get: vi.fn().mockReturnValue(true),
    };
    const mcpApiKeyService = {
      isKeyUsable: vi.fn().mockResolvedValue(opts.isKeyUsable ?? true),
    };
    const logger = { warn: vi.fn(), verbose: vi.fn(), error: vi.fn() };
    const service = new McpServerService(
      configService as any,
      {} as any,
      {} as any,
      {} as any,
      { checkToolAllowed: vi.fn() } as any,
      logger as any,
      mcpApiKeyService as any
    );

    const transport = {
      handleRequest: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const authenticatedActor = new ActorContext();
    authenticatedActor.actorID = 'user-1';
    authenticatedActor.isAnonymous = false;

    const session = {
      transport,
      server: {} as any,
      actorContext: authenticatedActor,
      apiKeyId: KEY_ID,
    };
    (service as any).sessions.set(SESSION_ID, session);

    const res: any = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      setHeader: vi.fn((k: string, v: string) => {
        res.headers[k] = v;
      }),
      end: vi.fn(),
    };

    return { service, session, transport, res, mcpApiKeyService, logger };
  };

  it('D2 (mandated): initialize with a key, revoke it, reuse the session WITHOUT re-sending the bearer — request fails and the session closes (US2-AS5, FR-013, R-038-3)', async () => {
    // "revoke" is modeled by isKeyUsable now returning false for KEY_ID.
    const { service, transport, res, mcpApiKeyService } = setup({
      isKeyUsable: false,
    });

    // Reuse the session: sessionId present, NO fresh actorContext (undefined —
    // i.e. no bearer on this particular request).
    await service.handleRequest(
      {} as any,
      res,
      SESSION_ID,
      undefined,
      undefined,
      undefined
    );

    expect(mcpApiKeyService.isKeyUsable).toHaveBeenCalledWith(KEY_ID);
    expect(transport.handleRequest).not.toHaveBeenCalled();
    expect(transport.close).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(401);
    expect((service as any).sessions.has(SESSION_ID)).toBe(false);
  });

  it('serves the request when the key is still usable', async () => {
    const { service, transport, res, mcpApiKeyService } = setup({
      isKeyUsable: true,
    });

    await service.handleRequest(
      {} as any,
      res,
      SESSION_ID,
      undefined,
      undefined,
      undefined
    );

    expect(mcpApiKeyService.isKeyUsable).toHaveBeenCalledWith(KEY_ID);
    expect(transport.handleRequest).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect((service as any).sessions.has(SESSION_ID)).toBe(true);
  });

  it('performs NO additional key lookup when the request DOES carry a fresh key (FR-014, SC-007)', async () => {
    const { service, transport, res, mcpApiKeyService, session } = setup();
    const freshActor = new ActorContext();
    freshActor.actorID = 'user-1';
    freshActor.isAnonymous = false;

    await service.handleRequest(
      {} as any,
      res,
      SESSION_ID,
      freshActor,
      [{ operations: ['read'] }],
      'key-fresh'
    );

    // The strategy already revalidated this key on this request — the session
    // branch must not call isKeyUsable at all.
    expect(mcpApiKeyService.isKeyUsable).not.toHaveBeenCalled();
    expect(transport.handleRequest).toHaveBeenCalledTimes(1);
    expect(session.apiKeyId).toBe('key-fresh');
  });

  it('fails closed when the session has an authenticated identity but no apiKeyId (C-04, pre-existing session)', async () => {
    const { service, transport, res, mcpApiKeyService } = setup();
    // Simulate a session that predates this feature: authenticated identity,
    // but no apiKeyId was ever recorded.
    (service as any).sessions.get(SESSION_ID).apiKeyId = undefined;

    await service.handleRequest(
      {} as any,
      res,
      SESSION_ID,
      undefined,
      undefined,
      undefined
    );

    // isKeyUsable is never CALLED for an absent id (nothing to look up) — the
    // branch fails closed directly.
    expect(mcpApiKeyService.isKeyUsable).not.toHaveBeenCalled();
    expect(transport.handleRequest).not.toHaveBeenCalled();
    expect(transport.close).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(401);
  });

  it('leaves an anonymous session alone — no revalidation, no 401 (CodeRabbit, PR #6358)', async () => {
    const { service, transport, res, mcpApiKeyService } = setup();
    // A session that never authenticated: anonymous actorContext, no apiKeyId.
    // It holds no authority to revoke, so the revalidation branch must not
    // fire — and it must not be mistaken for a revoked-credential session and
    // torn down. Anonymous MCP access is a legitimate state (the strategy
    // returns an anonymous ActorContext rather than a 401 for an absent key);
    // per-operation scope enforcement is what constrains it, not this branch.
    const session = (service as any).sessions.get(SESSION_ID);
    session.actorContext = { actorID: '', isAnonymous: true };
    session.apiKeyId = undefined;

    await service.handleRequest(
      {} as any,
      res,
      SESSION_ID,
      undefined,
      undefined,
      undefined
    );

    expect(mcpApiKeyService.isKeyUsable).not.toHaveBeenCalled();
    expect(transport.close).not.toHaveBeenCalled();
    expect(transport.handleRequest).toHaveBeenCalledTimes(1);
    expect(res.statusCode).not.toBe(401);
  });
});

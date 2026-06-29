import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { IncomingMessage } from 'http';
import { vi } from 'vitest';
import { McpServerService } from '../mcp-server.service';
import { McpDelegationStrategy } from './mcp-delegation.strategy';

/**
 * US1 (T015) — the server-side enabler for the read-only assistant:
 *  - SC-003: a delegated read authorizes entities AS THE USER (same
 *    AuthorizationService as GraphQL) so the assistant reads only what the user
 *    can; a delegated read of an entity the user cannot read → access-denied.
 *  - SC-010: the delegated call is ATTRIBUTED to the assistant actor + the
 *    on-behalf-of user via the stamped `delegationContext`.
 *
 * OIDC rework (2026-06): Oathkeeper id_token JWTs are retired — the on-behalf-of
 * header now carries the USER's ACTOR ID (a UUID, resolved by the platform
 * edge's forwardAuth). The trust anchor is the assistant's ACTOR-BOUND
 * `mcp_api_key`: a key not bound to the virtual-assistant actor must never be
 * able to delegate.
 */
describe('MCP delegation (Flow A) — user-scoped + attributed', () => {
  const ASSISTANT_ACTOR_ID = '068b7478-0abd-4f19-906b-e1534f3b71b7';
  const USER_ACTOR_ID = '91b7e044-61ff-468b-a705-1672b0bda510';
  const NIL_UUID = '00000000-0000-0000-0000-000000000000';
  const VALID_KEY = 'mcp_validkey';

  const config = {
    get: vi.fn((key: string) => {
      if (key === 'mcp.enabled') return true;
      if (key === 'mcp.api_key_enabled') return true;
      return undefined;
    }),
  };

  const buildStrategy = (overrides?: {
    apiKeyValid?: boolean;
    keyActorId?: string | null;
    userContext?: ActorContext;
  }) => {
    const authenticationService = {
      createActorContext: vi.fn().mockResolvedValue(
        overrides?.userContext ??
          Object.assign(new ActorContext(), {
            actorID: USER_ACTOR_ID,
            isAnonymous: false,
            credentials: [{ type: 'space-member', resourceID: 'space-1' }],
          })
      ),
    };
    const mcpApiKeyService = {
      validateApiKey: vi.fn().mockResolvedValue(
        (overrides?.apiKeyValid ?? true)
          ? {
              id: 'key-1',
              actorId:
                overrides?.keyActorId === undefined
                  ? ASSISTANT_ACTOR_ID
                  : overrides.keyActorId,
            }
          : null
      ),
    };
    const virtualAssistantService = {
      getSingletonOrFail: vi.fn().mockResolvedValue({ id: ASSISTANT_ACTOR_ID }),
    };
    const logger = { verbose: vi.fn(), error: vi.fn(), warn: vi.fn() };

    const strategy = new McpDelegationStrategy(
      config as any,
      authenticationService as any,
      mcpApiKeyService as any,
      virtualAssistantService as any,
      logger as any
    );
    return { strategy, authenticationService, mcpApiKeyService };
  };

  /** A delegation request; pass explicit headers to deviate from the happy path. */
  const req = (headers?: Record<string, string>) =>
    ({
      headers: headers ?? {
        authorization: `Bearer ${VALID_KEY}`,
        'x-alkemio-on-behalf-of': USER_ACTOR_ID,
      },
    }) as unknown as IncomingMessage;

  it('builds a delegated context: user credentials + attribution (SC-010)', async () => {
    const { strategy, authenticationService } = buildStrategy();

    const ctx = await strategy.validate(req());

    expect(ctx).not.toBeNull();
    // The USER is resolved from the on-behalf-of actor id.
    expect(authenticationService.createActorContext).toHaveBeenCalledWith(
      USER_ACTOR_ID
    );
    // Authorization basis is the USER (effective ⊆ user privileges).
    expect(ctx!.actorID).toBe(USER_ACTOR_ID);
    expect(ctx!.isAnonymous).toBe(false);
    expect(ctx!.credentials[0].type).toBe('space-member');
    // Attribution to the assistant actor + the on-behalf-of user (SC-010).
    expect(ctx!.delegationContext).toEqual({
      assistantActorId: ASSISTANT_ACTOR_ID,
      onBehalfOfUserId: USER_ACTOR_ID,
    });
  });

  it('refuses (null) when the assistant actor credential is invalid', async () => {
    const { strategy } = buildStrategy({ apiKeyValid: false });
    expect(await strategy.validate(req())).toBeNull();
  });

  it('refuses (null) when no actor credential is present (not a delegation call)', async () => {
    const { strategy } = buildStrategy();
    expect(
      await strategy.validate(req({ 'x-alkemio-on-behalf-of': USER_ACTOR_ID }))
    ).toBeNull();
  });

  it('is not a delegation call without the on-behalf-of header', async () => {
    const { strategy } = buildStrategy();
    expect(
      await strategy.validate(req({ authorization: `Bearer ${VALID_KEY}` }))
    ).toBeNull();
  });

  it('refuses the nil-UUID anonymous sentinel and non-UUID values', async () => {
    const { strategy } = buildStrategy();
    expect(
      await strategy.validate(
        req({
          authorization: `Bearer ${VALID_KEY}`,
          'x-alkemio-on-behalf-of': NIL_UUID,
        })
      )
    ).toBeNull();
    expect(
      await strategy.validate(
        req({
          authorization: `Bearer ${VALID_KEY}`,
          'x-alkemio-on-behalf-of': 'not-a-uuid',
        })
      )
    ).toBeNull();
  });

  it('refuses a credential NOT bound to the virtual-assistant actor (trust anchor)', async () => {
    // A user-bound key (actorId null) must never delegate…
    const { strategy } = buildStrategy({ keyActorId: null });
    expect(await strategy.validate(req())).toBeNull();
    // …nor a key bound to some OTHER actor.
    const other = buildStrategy({
      keyActorId: '11111111-1111-4111-8111-111111111111',
    });
    expect(await other.strategy.validate(req())).toBeNull();
  });

  it('refuses (null) when the on-behalf-of user resolves to anonymous', async () => {
    const anon = Object.assign(new ActorContext(), { isAnonymous: true });
    const { strategy } = buildStrategy({ userContext: anon });
    expect(await strategy.validate(req())).toBeNull();
  });
});

/**
 * SC-003: entity access on a delegated call flows through the SAME
 * AuthorizationService as GraphQL, against the USER's context — content is
 * returned only when the user is authorized, and a denied entity yields
 * access-denied regardless of the assistant identity.
 */
describe('MCP delegation — entity access is bound to the user (SC-003)', () => {
  const uri = 'alkemio://whiteboards/wb-1';
  const policy = { id: 'auth-policy-1' };

  const delegatedUserContext = () =>
    Object.assign(new ActorContext(), {
      actorID: 'user-actor-1',
      isAnonymous: false,
      credentials: [{ type: 'space-member', resourceID: 'space-1' }],
      delegationContext: {
        assistantActorId: 'assistant-actor-1',
        onBehalfOfUserId: 'user-actor-1',
      },
    });

  const setup = (granted: boolean) => {
    const provider = {
      getResourceDefinitions: () => [],
      matches: () => true,
      getAuthorizationPolicy: vi.fn().mockResolvedValue(policy),
      read: vi.fn().mockResolvedValue({
        contents: [{ uri, mimeType: 'application/json', text: '{"ok":true}' }],
      }),
    };
    const resourceRegistry = {
      getProvider: vi.fn().mockReturnValue(provider),
    };
    const authorizationService = {
      isAccessGranted: vi.fn().mockReturnValue(granted),
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
      logger as any
    );
    return { service, provider, authorizationService };
  };

  it('returns content for an entity the user CAN read (SC-003), authorizing as the user', async () => {
    const { service, authorizationService } = setup(true);
    const ctx = delegatedUserContext();

    const result = await service.readResource(uri, ctx);

    expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
      ctx,
      policy,
      AuthorizationPrivilege.READ
    );
    expect(result.contents[0].text).toBe('{"ok":true}');
  });

  it('access-denied for an entity the user CANNOT read, never calling read()', async () => {
    const { service, provider } = setup(false);
    await expect(
      service.readResource(uri, delegatedUserContext())
    ).rejects.toThrow(/Access denied/);
    expect(provider.read).not.toHaveBeenCalled();
  });
});

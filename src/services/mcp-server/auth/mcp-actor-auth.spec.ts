import { ActorContext } from '@core/actor-context/actor.context';
import { IncomingMessage } from 'http';
import { vi } from 'vitest';
import {
  AssistantCapabilityGateService,
  CAPABILITY_DISABLED_REASON,
} from '../capabilities/assistant.capability.gate.service';
import { McpApiKeyStrategy } from './mcp-api-key.strategy';

/**
 * Phase 6 (T031) — system-invoked (Flow B) actor auth + admin-grant gating.
 *
 * The `virtual-assistant` actor authenticates to the MCP host with its OWN
 * ACTOR-BOUND `mcp_api_key` (no user JWT, no on-behalf-of header). The host:
 *  - builds the ACTOR's ActorContext via `buildForActor` (T027/T028), and
 *  - stamps attribution `{ assistantActorId, onBehalfOfUserId: null }` (FR-016/
 *    FR-019 — system-invoked has no user), and
 *  - gates each tool against the actor's ADMIN `capabilityGrant` (T030) —
 *    a write is allowed only where an admin explicitly enabled it; default
 *    read-only.
 */
describe('MCP actor auth (Flow B) — buildForActor + system-invoked attribution (T027/T028)', () => {
  const ACTOR_ID = 'assistant-actor-1';

  const buildStrategy = (key: { actorId?: string; userId?: string }) => {
    const configService = {
      get: vi.fn((k: string) => {
        if (k === 'mcp.enabled') return true;
        if (k === 'mcp.api_key_enabled') return true;
        return undefined;
      }),
    };
    const mcpApiKeyService = {
      validateApiKey: vi.fn().mockResolvedValue({
        id: 'key-1',
        scopes: [{ operations: ['tools'] }],
        ...key,
      }),
      updateLastUsed: vi.fn().mockResolvedValue(undefined),
    };
    const actorContextService = {
      buildForActor: vi.fn().mockResolvedValue(
        Object.assign(new ActorContext(), {
          actorID: ACTOR_ID,
          isAnonymous: false,
          credentials: [{ type: 'global-registered', resourceID: '' }],
        })
      ),
      buildForUser: vi.fn().mockResolvedValue(
        Object.assign(new ActorContext(), {
          actorID: 'user-1',
          isAnonymous: false,
        })
      ),
      createAnonymous: vi
        .fn()
        .mockReturnValue(
          Object.assign(new ActorContext(), { isAnonymous: true })
        ),
    };
    const logger = { verbose: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const strategy = new McpApiKeyStrategy(
      configService as any,
      mcpApiKeyService as any,
      actorContextService as any,
      logger as any
    );
    return { strategy, actorContextService, mcpApiKeyService };
  };

  const actorKeyRequest = () =>
    ({
      headers: { authorization: 'Bearer mcp_actorkey' },
      socket: {},
    }) as unknown as IncomingMessage;

  it('an ACTOR-bound key builds the actor context via buildForActor and stamps system-invoked attribution', async () => {
    const { strategy, actorContextService } = buildStrategy({
      actorId: ACTOR_ID,
    });

    const ctx = await strategy.validate(actorKeyRequest());

    expect(actorContextService.buildForActor).toHaveBeenCalledWith(ACTOR_ID);
    expect(actorContextService.buildForUser).not.toHaveBeenCalled();
    expect(ctx.actorID).toBe(ACTOR_ID);
    expect(ctx.isAnonymous).toBe(false);
    // System-invoked attribution: actor is the author, no on-behalf-of user.
    expect(ctx.delegationContext).toEqual({
      assistantActorId: ACTOR_ID,
      onBehalfOfUserId: null,
    });
  });

  it('a USER-bound key still uses buildForUser (no attribution, backward-compatible)', async () => {
    const { strategy, actorContextService } = buildStrategy({
      userId: 'user-1',
    });

    const ctx = await strategy.validate(actorKeyRequest());

    expect(actorContextService.buildForUser).toHaveBeenCalledWith('user-1');
    expect(actorContextService.buildForActor).not.toHaveBeenCalled();
    expect(ctx.delegationContext).toBeUndefined();
  });
});

/**
 * T031 — the per-tool capability gate (T030) gates a SYSTEM-INVOKED actor call
 * against the actor's ADMIN `capabilityGrant`: a write is refused unless the
 * admin enabled it; a read it enables is allowed. Independent of any user grant.
 */
describe('Capability gate — system-invoked actor call (T030/T031)', () => {
  const ACTOR_ID = 'assistant-actor-1';

  /** A SYSTEM-INVOKED actor context: actorID is the actor, onBehalfOf null. */
  const actorContext = (): ActorContext =>
    Object.assign(new ActorContext(), {
      actorID: ACTOR_ID,
      isAnonymous: false,
      delegationContext: {
        assistantActorId: ACTOR_ID,
        onBehalfOfUserId: null,
      },
    });

  const buildGate = (
    capabilityGrant: { capability: string; enabled: boolean }[]
  ) => {
    const userRepository = { findOne: vi.fn() };
    const virtualAssistantService = {
      getVirtualAssistantOrFail: vi
        .fn()
        .mockResolvedValue({ id: ACTOR_ID, capabilityGrant }),
    };
    const logger = { verbose: vi.fn() };
    const gate = new AssistantCapabilityGateService(
      userRepository as any,
      virtualAssistantService as any,
      logger as any
    );
    return { gate, userRepository, virtualAssistantService };
  };

  it('refuses a WRITE the admin has NOT enabled on the actor (capability_disabled), without touching any user grant', async () => {
    const { gate, userRepository, virtualAssistantService } = buildGate([
      { capability: 'create_whiteboard', enabled: false },
    ]);

    const reason = await gate.checkToolAllowed(
      'create_whiteboard',
      actorContext()
    );

    expect(reason).toBe(CAPABILITY_DISABLED_REASON);
    // System-invoked path reads the ACTOR's grant, never the user repo.
    expect(
      virtualAssistantService.getVirtualAssistantOrFail
    ).toHaveBeenCalledWith(ACTOR_ID);
    expect(userRepository.findOne).not.toHaveBeenCalled();
  });

  it('allows a WRITE the admin explicitly enabled on the actor', async () => {
    const { gate } = buildGate([
      { capability: 'create_whiteboard', enabled: true },
    ]);
    const reason = await gate.checkToolAllowed(
      'create_whiteboard',
      actorContext()
    );
    expect(reason).toBeNull();
  });

  it('refuses a capability absent from the actor grant (absence = disabled, read-only default)', async () => {
    const { gate } = buildGate([
      { capability: 'search_content', enabled: true },
    ]);
    const reason = await gate.checkToolAllowed(
      'update_whiteboard_content',
      actorContext()
    );
    expect(reason).toBe(CAPABILITY_DISABLED_REASON);
  });

  it('allows a READ the admin grant enables', async () => {
    const { gate } = buildGate([
      { capability: 'search_content', enabled: true },
    ]);
    const reason = await gate.checkToolAllowed(
      'search_content',
      actorContext()
    );
    expect(reason).toBeNull();
  });
});

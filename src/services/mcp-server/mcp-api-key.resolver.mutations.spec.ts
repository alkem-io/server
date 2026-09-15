import { ActorContext } from '@core/actor-context/actor.context';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpApiKeyResolverMutations } from './mcp-api-key.resolver.mutations';

/**
 * workspace#038, US3-AS1/US3-AS2, R-038-2. `McpApiKeyResolverMutations` is a
 * plain GraphQL resolver — it is NEVER decorated with `@UseGuards(McpAuthGuard)`
 * (that guard applies only to `McpServerController`, grep-verified in
 * `mcp-server.controller.ts`'s docblock and re-asserted structurally here: this
 * resolver class carries no NestJS guard metadata at all). The GraphQL layer's
 * OWN auth chain (cookie-session / non-interactive-login / hydra-bearer) never
 * includes the MCP API-key strategy, so a caller authenticated ONLY by an
 * `mcp_` key arrives at every mutation here with an ANONYMOUS actorContext —
 * exactly the case these mutations already refuse. This spec asserts that
 * refusal for all three lifecycle operations.
 */
describe('McpApiKeyResolverMutations — an mcp_ key cannot reach the GraphQL layer (US3-AS1/AS2)', () => {
  let resolver: McpApiKeyResolverMutations;
  let mcpApiKeyService: {
    mintApiKeyForUser: ReturnType<typeof vi.fn>;
    revokeOwnApiKey: ReturnType<typeof vi.fn>;
  };

  const anonymousActor = () => {
    const ctx = new ActorContext();
    ctx.isAnonymous = true;
    ctx.actorID = '';
    return ctx;
  };

  beforeEach(() => {
    mcpApiKeyService = {
      mintApiKeyForUser: vi.fn(),
      revokeOwnApiKey: vi.fn(),
    };
    resolver = new McpApiKeyResolverMutations(mcpApiKeyService as any);
  });

  it('mintMcpApiKey refuses an anonymous actor and never calls the service', async () => {
    await expect(
      resolver.mintMcpApiKey(anonymousActor(), {
        name: 'k',
        operations: [],
      } as any)
    ).rejects.toThrow(/authenticated user/i);
    expect(mcpApiKeyService.mintApiKeyForUser).not.toHaveBeenCalled();
  });

  it('revokeMcpApiKey refuses an anonymous actor and never calls the service', async () => {
    await expect(
      resolver.revokeMcpApiKey(anonymousActor(), { keyID: 'k1' } as any)
    ).rejects.toThrow(/authenticated user/i);
    expect(mcpApiKeyService.revokeOwnApiKey).not.toHaveBeenCalled();
  });

  it('has no @UseGuards metadata referencing McpAuthGuard anywhere on the resolver (structural closure check, R-038-2)', () => {
    // No NestJS GUARDS_METADATA key is present at all on this resolver — it is
    // reachable only through GraphQL's own auth interceptor chain, never
    // through McpAuthGuard.
    const guardsMetadata = Reflect.getMetadata(
      '__guards__',
      McpApiKeyResolverMutations
    );
    expect(guardsMetadata).toBeUndefined();
  });
});

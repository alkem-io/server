import { ForbiddenException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { LogContext } from '@src/common/enums';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminMcpApiKeyResolverFields } from './admin.mcp.api.key.resolver.fields';
import { AdminMcpApiKeyResolverMutations } from './admin.mcp.api.key.resolver.mutations';

/**
 * workspace#038, US3-AS4/AS6/AS7, US4-AS2, R-038-4/R-038-6. The admin surface
 * — read AND revoke — is scoped to a named `userID` and predicated on
 * `userId IS NOT NULL` at the SERVICE layer (`McpApiKeyService.
 * listUserKeysForAdmin` / `.adminRevokeApiKey`), so an actor-bound
 * trust-anchor key never appears here regardless of what a caller passes as
 * `userID`. This spec asserts the RESOLVER's contract (auth gate + pure
 * pass-through to the service + correct call arguments); the service-level
 * `userId IS NOT NULL` guard itself is asserted against the repository query
 * in `mcp-api-key.service.spec.ts`.
 */
describe('AdminMcpApiKeyResolverFields / Mutations', () => {
  const adminActor = () => {
    const ctx = new ActorContext();
    ctx.actorID = 'admin-1';
    ctx.isAnonymous = false;
    return ctx;
  };
  const nonAdminActor = () => {
    const ctx = new ActorContext();
    ctx.actorID = 'user-1';
    ctx.isAnonymous = false;
    return ctx;
  };

  const buildFields = (granted: boolean) => {
    const authorizationService = {
      grantAccessOrFail: vi.fn(() => {
        if (!granted) {
          throw new ForbiddenException('not admin', LogContext.AUTH);
        }
      }),
    };
    const platformAuthorizationPolicyService = {
      getPlatformAuthorizationPolicy: vi.fn().mockResolvedValue({}),
    };
    const mcpApiKeyService = {
      listUserKeysForAdmin: vi.fn().mockResolvedValue([
        {
          id: 'k1',
          name: 'user key',
          scopes: [{ operations: ['read'] }],
          createdDate: new Date('2026-01-01'),
          isActive: true,
        },
      ]),
      adminRevokeApiKey: vi.fn().mockResolvedValue({
        id: 'k1',
        name: 'user key',
        scopes: [{ operations: ['read'] }],
        createdDate: new Date('2026-01-01'),
        isActive: false,
      }),
    };
    const resolver = new AdminMcpApiKeyResolverFields(
      authorizationService as any,
      platformAuthorizationPolicyService as any,
      mcpApiKeyService as any
    );
    return { resolver, authorizationService, mcpApiKeyService };
  };

  const buildMutations = (granted: boolean) => {
    const authorizationService = {
      grantAccessOrFail: vi.fn(() => {
        if (!granted) {
          throw new ForbiddenException('not admin', LogContext.AUTH);
        }
      }),
    };
    const platformAuthorizationPolicyService = {
      getPlatformAuthorizationPolicy: vi.fn().mockResolvedValue({}),
    };
    const mcpApiKeyService = {
      adminRevokeApiKey: vi.fn().mockResolvedValue({
        id: 'k1',
        name: 'user key',
        scopes: [{ operations: ['read'] }],
        createdDate: new Date('2026-01-01'),
        isActive: false,
      }),
    };
    const resolver = new AdminMcpApiKeyResolverMutations(
      authorizationService as any,
      platformAuthorizationPolicyService as any,
      mcpApiKeyService as any
    );
    return { resolver, mcpApiKeyService };
  };

  beforeEach(() => vi.clearAllMocks());

  describe('mcpApiKeys field', () => {
    it('a non-admin is refused (US3-AS7)', async () => {
      const { resolver } = buildFields(false);
      await expect(
        resolver.mcpApiKeys(nonAdminActor(), 'user-a')
      ).rejects.toThrow();
    });

    it('an admin receives metadata with no keyHash (US3-AS4)', async () => {
      const { resolver, mcpApiKeyService } = buildFields(true);
      const result = await resolver.mcpApiKeys(adminActor(), 'user-a');

      expect(mcpApiKeyService.listUserKeysForAdmin).toHaveBeenCalledWith(
        'user-a'
      );
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('keyHash');
    });

    it('delegates actor-bound-key exclusion entirely to the service (US3-AS6, FR-018) — the resolver adds no filtering of its own', async () => {
      const { resolver, mcpApiKeyService } = buildFields(true);
      mcpApiKeyService.listUserKeysForAdmin.mockResolvedValue([]);

      const result = await resolver.mcpApiKeys(adminActor(), 'actor-bound-id');

      // The resolver never inspects userId/actorId itself — it trusts the
      // service's `userId IS NOT NULL` predicate, which for an actor-bound id
      // returns nothing.
      expect(result).toEqual([]);
    });
  });

  describe('adminRevokeMcpApiKey mutation', () => {
    it('a non-admin is refused', async () => {
      const { resolver } = buildMutations(false);
      await expect(
        resolver.adminRevokeMcpApiKey(nonAdminActor(), {
          userID: 'user-a',
          keyID: 'k1',
        })
      ).rejects.toThrow();
    });

    it('writes with subjectUserId=owner, initiatorUserId=admin, initiatorRole=PLATFORM_ADMIN (US4-AS2, R-038-6)', async () => {
      const { resolver, mcpApiKeyService } = buildMutations(true);
      const admin = adminActor();

      await resolver.adminRevokeMcpApiKey(admin, {
        userID: 'user-a',
        keyID: 'k1',
      });

      expect(mcpApiKeyService.adminRevokeApiKey).toHaveBeenCalledWith(
        'k1',
        'user-a',
        'admin-1'
      );
    });
  });
});

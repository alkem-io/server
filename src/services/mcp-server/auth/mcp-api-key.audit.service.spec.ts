import { PlatformAuditCategory } from '@domain/community/user-email-change/enums/platform.audit.category';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpApiKeyOperation } from '../dto/mcp.api.key.dto';
import { McpApiKeyAuditService } from './mcp-api-key.audit.service';

/**
 * workspace#038, US4-AS1/AS3, FR-021/FR-022. Also asserts the FORBIDDEN
 * fields — plaintext, `keyHash`, caller-supplied IP — never reach the
 * details allowlist, by construction (there is no code path that could add
 * them: `RecordMintInput`/`RecordRevokeInput` do not carry those fields at
 * all, so this is a structural guarantee re-asserted here as a regression
 * trip-wire).
 */
describe('McpApiKeyAuditService', () => {
  const build = () => {
    const manager: any = {
      create: vi.fn((_entity: any, data: any) => data),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const service = new McpApiKeyAuditService();
    return { service, manager };
  };

  beforeEach(() => vi.clearAllMocks());

  describe('recordMint', () => {
    it('writes exactly one row with category=mcp_api_key, outcome=key_minted', async () => {
      const { service, manager } = build();

      await service.recordMint(manager, {
        ownerUserId: 'owner-1',
        initiatorUserId: 'owner-1',
        initiatorRole: PlatformAuditInitiatorRole.SELF,
        keyId: 'key-1',
        keyName: 'my-key',
        operations: [McpApiKeyOperation.READ, McpApiKeyOperation.TOOLS],
      });

      expect(manager.save).toHaveBeenCalledTimes(1);
      const entry = manager.create.mock.calls[0][1];
      expect(entry.category).toBe(PlatformAuditCategory.MCP_API_KEY);
      expect(entry.outcome).toBe(PlatformAuditOutcome.KEY_MINTED);
    });

    it('sets subjectUserId=initiatorUserId=owner for a self-service mint (SELF role)', async () => {
      const { service, manager } = build();

      await service.recordMint(manager, {
        ownerUserId: 'owner-1',
        initiatorUserId: 'owner-1',
        initiatorRole: PlatformAuditInitiatorRole.SELF,
        keyId: 'key-1',
        keyName: 'my-key',
        operations: [McpApiKeyOperation.READ],
      });

      const entry = manager.create.mock.calls[0][1];
      expect(entry.subjectUserId).toBe('owner-1');
      expect(entry.initiatorUserId).toBe('owner-1');
      expect(entry.initiatorRole).toBe(PlatformAuditInitiatorRole.SELF);
    });

    it('the details object contains none of the plaintext, keyHash, or an IP (FR-022)', async () => {
      const { service, manager } = build();

      await service.recordMint(manager, {
        ownerUserId: 'owner-1',
        initiatorUserId: 'owner-1',
        initiatorRole: PlatformAuditInitiatorRole.SELF,
        keyId: 'key-1',
        keyName: 'my-key',
        operations: [McpApiKeyOperation.READ],
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      });

      const entry = manager.create.mock.calls[0][1];
      const details = entry.details;
      const serialized = JSON.stringify(details);

      expect(Object.keys(details).sort()).toEqual(
        ['expiresAt', 'keyId', 'keyName', 'operations'].sort()
      );
      // Forbidden by construction — plaintext / hash / IP shaped keys.
      expect(details).not.toHaveProperty('apiKey');
      expect(details).not.toHaveProperty('keyHash');
      expect(details).not.toHaveProperty('lastUsedFromIp');
      expect(details).not.toHaveProperty('ip');
      expect(details).not.toHaveProperty('requestContext');
      // Nothing that looks like a 64-char sha256 hex digest leaked in.
      expect(serialized).not.toMatch(/[a-f0-9]{64}/);
      expect(details.expiresAt).toBe('2030-01-01T00:00:00.000Z');
    });
  });

  describe('recordRevoke', () => {
    it('writes exactly one row with category=mcp_api_key, outcome=key_revoked', async () => {
      const { service, manager } = build();

      await service.recordRevoke(manager, {
        ownerUserId: 'owner-1',
        initiatorUserId: 'admin-1',
        initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
        keyId: 'key-1',
        keyName: 'my-key',
      });

      expect(manager.save).toHaveBeenCalledTimes(1);
      const entry = manager.create.mock.calls[0][1];
      expect(entry.category).toBe(PlatformAuditCategory.MCP_API_KEY);
      expect(entry.outcome).toBe(PlatformAuditOutcome.KEY_REVOKED);
    });

    it('supports subject != initiator for an admin revoke (US4-AS2)', async () => {
      const { service, manager } = build();

      await service.recordRevoke(manager, {
        ownerUserId: 'owner-1',
        initiatorUserId: 'admin-1',
        initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
        keyId: 'key-1',
        keyName: 'my-key',
      });

      const entry = manager.create.mock.calls[0][1];
      expect(entry.subjectUserId).toBe('owner-1');
      expect(entry.initiatorUserId).toBe('admin-1');
      expect(entry.initiatorRole).toBe(
        PlatformAuditInitiatorRole.PLATFORM_ADMIN
      );
    });

    it('the revoke details object never carries operations, plaintext, or keyHash', async () => {
      const { service, manager } = build();

      await service.recordRevoke(manager, {
        ownerUserId: 'owner-1',
        initiatorUserId: 'owner-1',
        initiatorRole: PlatformAuditInitiatorRole.SELF,
        keyId: 'key-1',
        keyName: 'my-key',
      });

      const entry = manager.create.mock.calls[0][1];
      expect(Object.keys(entry.details).sort()).toEqual(['keyId', 'keyName']);
    });
  });

  it('propagates a save failure rather than swallowing it (fail-closed, unlike PlatformOperationsAuditService)', async () => {
    const { service, manager } = build();
    manager.save.mockRejectedValueOnce(new Error('db unavailable'));

    await expect(
      service.recordMint(manager, {
        ownerUserId: 'owner-1',
        initiatorUserId: 'owner-1',
        initiatorRole: PlatformAuditInitiatorRole.SELF,
        keyId: 'key-1',
        keyName: 'my-key',
        operations: [McpApiKeyOperation.READ],
      })
    ).rejects.toThrow('db unavailable');
  });
});

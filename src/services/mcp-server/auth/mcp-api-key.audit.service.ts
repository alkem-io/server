import { PlatformAuditCategory } from '@domain/community/user-email-change/enums/platform.audit.category';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { McpApiKeyAuditDetails } from '@domain/community/user-email-change/platform.audit.entry.interface';
import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { McpApiKeyOperation } from '../dto/mcp.api.key.dto';

/**
 * Compile-time guard for the cast below. `McpApiKeyAuditDetails.operations` is
 * declared as `('read' | 'tools')[]` in the domain layer, which deliberately
 * does not import this service-layer enum. This assertion fails the build if
 * the enum ever grows a third member, so the cast can never silently lie.
 */
type _EnumMatchesAuditDetails = `${McpApiKeyOperation}` extends 'read' | 'tools'
  ? true
  : never;
const _enumMatchesAuditDetails: _EnumMatchesAuditDetails = true;
void _enumMatchesAuditDetails;

export interface RecordMintInput {
  /** The key's owner — written as `subjectUserId`. */
  ownerUserId: string;
  /** Who performed the mint — the owner for self-service. */
  initiatorUserId: string;
  initiatorRole: PlatformAuditInitiatorRole;
  keyId: string;
  keyName: string;
  operations: McpApiKeyOperation[];
  expiresAt?: Date;
}

export interface RecordRevokeInput {
  /** The key's owner — written as `subjectUserId`. */
  ownerUserId: string;
  /** Who performed the revoke — the owner (self) or an admin. */
  initiatorUserId: string;
  initiatorRole: PlatformAuditInitiatorRole;
  keyId: string;
  keyName: string;
}

/**
 * Audit trail for the MCP API key lifecycle (workspace#038, FR-021/FR-022).
 * One `platform_audit_entry` row per mint or revoke.
 *
 * FAIL-CLOSED by construction — deliberately UNLIKE `PlatformOperationsAuditService`
 * (research.md R-04): every method here takes the caller's `EntityManager` so
 * it enlists in the SAME transaction as the key mutation, and re-throws on
 * failure so a broken audit write rolls back the key change (FR-023). Details
 * are built from an explicit allowlist — never a spread of the raw input — so
 * the plaintext, `keyHash`, or any caller-supplied IP can never reach the
 * audit row (FR-022).
 */
@Injectable()
export class McpApiKeyAuditService {
  public async recordMint(
    manager: EntityManager,
    input: RecordMintInput
  ): Promise<void> {
    const details: McpApiKeyAuditDetails = {
      keyId: input.keyId,
      keyName: input.keyName,
      operations: [...input.operations] as ('read' | 'tools')[],
    };
    if (input.expiresAt) {
      details.expiresAt = input.expiresAt.toISOString();
    }
    const entry = manager.create(PlatformAuditEntry, {
      category: PlatformAuditCategory.MCP_API_KEY,
      subjectUserId: input.ownerUserId,
      initiatorUserId: input.initiatorUserId,
      initiatorRole: input.initiatorRole,
      outcome: PlatformAuditOutcome.KEY_MINTED,
      details,
    });
    await manager.save(entry);
  }

  public async recordRevoke(
    manager: EntityManager,
    input: RecordRevokeInput
  ): Promise<void> {
    const details: McpApiKeyAuditDetails = {
      keyId: input.keyId,
      keyName: input.keyName,
    };
    const entry = manager.create(PlatformAuditEntry, {
      category: PlatformAuditCategory.MCP_API_KEY,
      subjectUserId: input.ownerUserId,
      initiatorUserId: input.initiatorUserId,
      initiatorRole: input.initiatorRole,
      outcome: PlatformAuditOutcome.KEY_REVOKED,
      details,
    });
    await manager.save(entry);
  }
}

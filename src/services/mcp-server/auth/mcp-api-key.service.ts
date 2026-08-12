import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, IsNull, MoreThan, Repository } from 'typeorm';
import { McpApiKeyOperation } from '../dto/mcp.api.key.dto';
import { McpApiKeyScope } from '../dto/mcp.types';
import { McpApiKeyAuditService } from './mcp-api-key.audit.service';
import { McpApiKey } from './mcp-api-key.entity';

export interface CreateMcpApiKeyInput {
  name: string;
  description?: string;
  /** Bind the key to a User (`buildForUser`). Exactly one of userId / actorId. */
  userId?: string;
  /**
   * Bind the key to an Actor (`buildForActor`) — e.g. the `virtual-assistant`
   * actor for the system-invoked path (004-web-ai-assistant T027). Exactly one
   * of userId / actorId.
   */
  actorId?: string;
  scopes?: McpApiKeyScope[];
  expiresAt?: Date;
}

export interface CreateMcpApiKeyResult {
  id: string;
  name: string;
  apiKey: string; // The plain text key - only returned on creation
  expiresAt?: Date;
}

/**
 * Cap on USABLE (active + unexpired + user-bound) MCP API keys per user
 * (workspace#038, FR-005/FR-006). A hardcoded service constant, deliberately
 * NOT an `alkemio.config.ts` field — infrastructure-operations stays out of
 * this feature. Revoked and expired keys do not consume the allowance
 * (data-model.md §"Usable").
 */
export const MCP_API_KEY_MAX_USABLE_PER_USER = 10;

export interface MintApiKeyForUserInput {
  name: string;
  operations: McpApiKeyOperation[];
  expiresAt?: Date;
}

export interface MintApiKeyForUserResult {
  entity: McpApiKey;
  /** The plaintext key. Only ever available here, at mint time (FR-002). */
  plaintext: string;
}

@Injectable()
export class McpApiKeyService {
  constructor(
    @InjectRepository(McpApiKey)
    private readonly mcpApiKeyRepository: Repository<McpApiKey>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly entityManager: EntityManager,
    private readonly auditService: McpApiKeyAuditService
  ) {}

  /**
   * Create a new MCP API key
   * Returns the plain text key only once - it cannot be retrieved again
   */
  async createApiKey(
    input: CreateMcpApiKeyInput
  ): Promise<CreateMcpApiKeyResult> {
    // Generate a secure random key
    const plainTextKey = this.generateApiKey();
    const keyHash = this.hashApiKey(plainTextKey);

    if (!input.userId === !input.actorId) {
      throw new EntityNotFoundException(
        'An MCP API key must bind to exactly one of userId / actorId',
        LogContext.MCP_SERVER,
        { hasUserId: !!input.userId, hasActorId: !!input.actorId }
      );
    }

    const apiKey = new McpApiKey();
    apiKey.name = input.name;
    apiKey.description = input.description;
    apiKey.userId = input.userId;
    apiKey.actorId = input.actorId;
    apiKey.keyHash = keyHash;
    apiKey.scopes = input.scopes || [{ operations: ['read'] }];
    apiKey.expiresAt = input.expiresAt;
    apiKey.isActive = true;

    const saved = await this.mcpApiKeyRepository.save(apiKey);

    this.logger.verbose?.(
      `Created MCP API key: ${saved.id} for ${input.actorId ? `actor: ${input.actorId}` : `user: ${input.userId}`}`,
      LogContext.MCP_SERVER
    );

    return {
      id: saved.id,
      name: saved.name,
      apiKey: plainTextKey,
      expiresAt: saved.expiresAt,
    };
  }

  /**
   * Mint a new USER-bound MCP API key with PAT semantics (workspace#038,
   * FR-001..FR-006). One short transaction: takes a per-user advisory lock
   * (so a concurrent mint at the cap boundary serializes rather than racing —
   * FR-006/R-038-1), counts usable keys against
   * {@link MCP_API_KEY_MAX_USABLE_PER_USER}, normalizes operations to ONE
   * de-duplicated `{operations}` scope object (never `spaceIds` — FR-004),
   * inserts the key, and records the mint audit row — all or nothing (FR-023):
   * if the audit write throws, the whole transaction (including the insert)
   * rolls back.
   */
  async mintApiKeyForUser(
    userId: string,
    input: MintApiKeyForUserInput
  ): Promise<MintApiKeyForUserResult> {
    if (input.expiresAt && input.expiresAt.getTime() <= Date.now()) {
      throw new ValidationException(
        'MCP API key expiresAt must be in the future',
        LogContext.MCP_SERVER,
        { expiresAt: input.expiresAt.toISOString() }
      );
    }

    const normalizedOperations = this.normalizeOperations(input.operations);
    if (normalizedOperations.length === 0) {
      throw new ValidationException(
        'MCP API key must grant at least one operation',
        LogContext.MCP_SERVER
      );
    }

    const plainTextKey = this.generateApiKey();
    const keyHash = this.hashApiKey(plainTextKey);

    const saved = await this.entityManager.transaction(async manager => {
      // Per-user advisory lock: serializes concurrent mints for the SAME user
      // so the cap check + insert below is race-free (FR-006). Released
      // automatically at transaction end (xact-scoped).
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        userId,
      ]);

      const usableCount = await manager.count(McpApiKey, {
        where: this.usableKeysWhere(userId),
      });
      if (usableCount >= MCP_API_KEY_MAX_USABLE_PER_USER) {
        throw new ValidationException(
          `MCP API key limit reached (${MCP_API_KEY_MAX_USABLE_PER_USER}). Revoke an existing key to free an allowance.`,
          LogContext.MCP_SERVER,
          { userId, limit: MCP_API_KEY_MAX_USABLE_PER_USER }
        );
      }

      const apiKey = new McpApiKey();
      apiKey.name = input.name;
      apiKey.userId = userId;
      apiKey.keyHash = keyHash;
      // Exactly ONE normalized scope object; never carries `spaceIds` (FR-004).
      apiKey.scopes = [{ operations: normalizedOperations }];
      apiKey.expiresAt = input.expiresAt;
      apiKey.isActive = true;

      const savedEntity = await manager.save(apiKey);

      // Fail-closed: throwing here rolls back the insert above (FR-023).
      await this.auditService.recordMint(manager, {
        ownerUserId: userId,
        initiatorUserId: userId,
        initiatorRole: PlatformAuditInitiatorRole.SELF,
        keyId: savedEntity.id,
        keyName: savedEntity.name,
        operations: normalizedOperations,
        expiresAt: savedEntity.expiresAt,
      });

      return savedEntity;
    });

    return { entity: saved, plaintext: plainTextKey };
  }

  /**
   * The "usable" predicate (data-model.md §Usable, FR-005):
   * `userId = :userId AND isActive = true AND (expiresAt IS NULL OR expiresAt > now())`.
   * Expressed as an OR of two AND'd FindOptionsWhere objects — TypeORM ORs an
   * array of where-conditions at the top level, AND's the keys within each.
   */
  private usableKeysWhere(userId: string) {
    const now = new Date();
    return [
      { userId, isActive: true, expiresAt: IsNull() },
      { userId, isActive: true, expiresAt: MoreThan(now) },
    ];
  }

  /** De-duplicates a requested operations list, preserving no particular order. */
  private normalizeOperations(
    operations: McpApiKeyOperation[]
  ): McpApiKeyOperation[] {
    return Array.from(new Set(operations));
  }

  /**
   * Ensure an ACTOR-bound MCP key exists for a KNOWN plaintext (idempotent).
   *
   * Unlike {@link createApiKey}, this does **not** generate a secret — the
   * plaintext is the input (the asvc's `ASSISTANT_MCP_API_KEY`), so the server
   * only ever stores its hash. Used by bootstrap to register the
   * `virtual-assistant` trust-anchor key from the shared secret (issue #1937):
   * create-if-absent, no-op if already present. Any OTHER active key bound to the
   * same actor (an older/rotated secret) is deactivated, so the current secret
   * cleanly supersedes it.
   */
  async ensureActorKeyFromPlaintext(
    actorId: string,
    plainTextKey: string,
    scopes: McpApiKeyScope[],
    name = 'virtual-assistant (bootstrap)'
  ): Promise<McpApiKey> {
    const keyHash = this.hashApiKey(plainTextKey);

    // Rotation: retire any active key bound to this actor whose hash differs —
    // the secret changed, so the old row must stop authenticating.
    const activeForActor = await this.mcpApiKeyRepository.find({
      where: { actorId, isActive: true },
    });
    for (const stale of activeForActor) {
      if (stale.keyHash !== keyHash) {
        stale.isActive = false;
        await this.mcpApiKeyRepository.save(stale);
        this.logger.verbose?.(
          `Deactivated rotated MCP API key ${stale.id} for actor ${actorId}`,
          LogContext.MCP_SERVER
        );
      }
    }

    const existing = await this.mcpApiKeyRepository.findOne({
      where: { keyHash },
    });
    if (existing) {
      return this.reassertActorKey(existing, actorId, scopes);
    }

    const apiKey = new McpApiKey();
    apiKey.name = name;
    apiKey.actorId = actorId;
    apiKey.keyHash = keyHash;
    apiKey.scopes = scopes;
    apiKey.isActive = true;
    try {
      const saved = await this.mcpApiKeyRepository.save(apiKey);
      this.logger.verbose?.(
        `Ensured actor-bound MCP API key ${saved.id} for actor ${actorId}`,
        LogContext.MCP_SERVER
      );
      return saved;
    } catch (error) {
      // A concurrent bootstrap (another replica) may have inserted the same
      // unique `keyHash` between our find and save — re-read and re-assert rather
      // than aborting startup on the duplicate-key error.
      if (this.isUniqueViolation(error)) {
        const raced = await this.mcpApiKeyRepository.findOne({
          where: { keyHash },
        });
        if (raced) {
          return this.reassertActorKey(raced, actorId, scopes);
        }
      }
      throw error;
    }
  }

  /**
   * Re-assert an existing row as the active, ACTOR-bound key with the given
   * scopes. Clears any `userId` (XOR trust-anchor invariant) and **refreshes
   * `scopes`** so a reactivated key never returns with stale permissions. A true
   * no-op (no write) when the row already matches on all four.
   */
  private async reassertActorKey(
    existing: McpApiKey,
    actorId: string,
    scopes: McpApiKeyScope[]
  ): Promise<McpApiKey> {
    const scopesMatch =
      JSON.stringify(existing.scopes) === JSON.stringify(scopes);
    if (
      !existing.isActive ||
      existing.actorId !== actorId ||
      existing.userId ||
      !scopesMatch
    ) {
      existing.isActive = true;
      existing.actorId = actorId;
      existing.userId = null as unknown as undefined; // NULL the column (TypeORM skips `undefined`)
      existing.scopes = scopes;
      return this.mcpApiKeyRepository.save(existing);
    }
    return existing;
  }

  /** Postgres `unique_violation` (23505), surfaced via TypeORM's QueryFailedError. */
  private isUniqueViolation(error: unknown): boolean {
    const code =
      (error as { code?: string; driverError?: { code?: string } })?.code ??
      (error as { driverError?: { code?: string } })?.driverError?.code;
    return code === '23505';
  }

  /**
   * Re-validate a key BY ID — active + unexpired — without the plaintext
   * (workspace#038, FR-013). Used ONLY by the session revalidation branch in
   * `McpServerService.handleRequest`, on a session-bearing request whose
   * incoming actorContext is anonymous: the session's identity was
   * established from a key, but this particular request carries no bearer to
   * re-derive the id from a plaintext, so the id captured at
   * establish/refresh time is re-checked directly instead.
   */
  async isKeyUsable(keyId: string): Promise<boolean> {
    const apiKey = await this.mcpApiKeyRepository.findOne({
      where: { id: keyId },
      select: { id: true, isActive: true, expiresAt: true },
    });
    if (!apiKey || !apiKey.isActive) {
      return false;
    }
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return false;
    }
    return true;
  }

  /**
   * Validate an API key and return the entity if valid
   */
  async validateApiKey(plainTextKey: string): Promise<McpApiKey | null> {
    const keyHash = this.hashApiKey(plainTextKey);

    const apiKey = await this.mcpApiKeyRepository.findOne({
      where: { keyHash, isActive: true },
    });

    if (!apiKey) {
      return null;
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      this.logger.verbose?.(
        `MCP API key expired: ${apiKey.id}`,
        LogContext.MCP_SERVER
      );
      return null;
    }

    return apiKey;
  }

  /**
   * Update last used timestamp for an API key
   */
  async updateLastUsed(keyId: string, ip?: string): Promise<void> {
    await this.mcpApiKeyRepository.update(keyId, {
      lastUsedAt: new Date(),
      lastUsedFromIp: ip,
    });
  }

  /**
   * List API keys for a user (without exposing the actual keys)
   */
  async listApiKeysForUser(userId: string): Promise<McpApiKey[]> {
    return this.mcpApiKeyRepository.find({
      where: { userId },
      order: { createdDate: 'DESC' },
    });
  }

  /**
   * Self-service list, allowlisted at the QUERY level (workspace#038,
   * FR-007/FR-008/FR-009): `keyHash` is excluded by the `select`, not by
   * downstream omission (R-01). Includes revoked and expired rows so
   * last-used forensic evidence survives revocation. Newest first.
   */
  async listUserKeysForProjection(userId: string): Promise<McpApiKey[]> {
    return this.mcpApiKeyRepository.find({
      select: {
        id: true,
        name: true,
        scopes: true,
        createdDate: true,
        expiresAt: true,
        lastUsedAt: true,
        lastUsedFromIp: true,
        isActive: true,
      },
      where: { userId },
      order: { createdDate: 'DESC' },
    });
  }

  /**
   * Admin list, scoped to a named USER-bound owner only (workspace#038,
   * FR-017/FR-018, ruling A9). `userId IS NOT NULL` is written explicitly, in
   * addition to `userId = :userId`, so an actor-bound trust-anchor key (e.g.
   * the virtual-assistant bootstrap key) can never be reached from this
   * surface — even though it is already redundant with a concrete `userId`
   * argument, the explicit predicate survives a future refactor that might
   * loosen the equality check. `keyHash` is excluded at the query level (R-01).
   */
  async listUserKeysForAdmin(userId: string): Promise<McpApiKey[]> {
    return this.mcpApiKeyRepository
      .createQueryBuilder('key')
      .select([
        'key.id',
        'key.name',
        'key.scopes',
        'key.createdDate',
        'key.expiresAt',
        'key.lastUsedAt',
        'key.lastUsedFromIp',
        'key.isActive',
      ])
      .where('key.userId = :userId', { userId })
      .andWhere('key.userId IS NOT NULL')
      .orderBy('key.createdDate', 'DESC')
      .getMany();
  }

  /**
   * Self-revoke (workspace#038, FR-010/FR-011). Sets `isActive = false` and
   * records the revoke audit row in ONE transaction (fail-closed — FR-023).
   * Idempotent: a key that is already revoked is returned unchanged, with NO
   * second audit row (SC-004: exactly one clean row per event). Not found —
   * including "found but owned by someone else" — surfaces the SAME generic
   * error, so existence of another user's key is never disclosed (US2 edge
   * case).
   */
  async revokeOwnApiKey(keyId: string, userId: string): Promise<McpApiKey> {
    return this.entityManager.transaction(async manager => {
      const apiKey = await manager.findOne(McpApiKey, {
        where: { id: keyId, userId },
      });
      if (!apiKey) {
        throw new EntityNotFoundException(
          'MCP API key not found',
          LogContext.MCP_SERVER,
          { keyId }
        );
      }

      if (apiKey.isActive) {
        apiKey.isActive = false;
        await manager.save(apiKey);
        await this.auditService.recordRevoke(manager, {
          ownerUserId: userId,
          initiatorUserId: userId,
          initiatorRole: PlatformAuditInitiatorRole.SELF,
          keyId: apiKey.id,
          keyName: apiKey.name,
        });
      }

      return apiKey;
    });
  }

  /**
   * Admin revoke, scoped to a named USER-bound owner only (workspace#038,
   * FR-017/FR-018). Same `userId IS NOT NULL` firewall as
   * {@link listUserKeysForAdmin} — an actor-bound key is neither listed nor
   * revocable from this surface. Records the revoke audit row with
   * `initiatorRole = PLATFORM_ADMIN` and `initiatorUserId = adminUserId`
   * (subject remains the key's owner) in the same transaction.
   */
  async adminRevokeApiKey(
    keyId: string,
    userId: string,
    adminUserId: string
  ): Promise<McpApiKey> {
    return this.entityManager.transaction(async manager => {
      const apiKey = await manager
        .createQueryBuilder(McpApiKey, 'key')
        .where('key.id = :keyId', { keyId })
        .andWhere('key.userId = :userId', { userId })
        .andWhere('key.userId IS NOT NULL')
        .getOne();
      if (!apiKey) {
        throw new EntityNotFoundException(
          'MCP API key not found',
          LogContext.MCP_SERVER,
          { keyId }
        );
      }

      if (apiKey.isActive) {
        apiKey.isActive = false;
        await manager.save(apiKey);
        await this.auditService.recordRevoke(manager, {
          ownerUserId: userId,
          initiatorUserId: adminUserId,
          initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
          keyId: apiKey.id,
          keyName: apiKey.name,
        });
      }

      return apiKey;
    });
  }

  /**
   * Revoke (deactivate) an API key
   */
  async revokeApiKey(keyId: string, userId: string): Promise<void> {
    const apiKey = await this.mcpApiKeyRepository.findOne({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new EntityNotFoundException(
        'MCP API key not found',
        LogContext.MCP_SERVER,
        { keyId }
      );
    }

    apiKey.isActive = false;
    await this.mcpApiKeyRepository.save(apiKey);

    this.logger.verbose?.(
      `Revoked MCP API key: ${keyId}`,
      LogContext.MCP_SERVER
    );
  }

  /**
   * Delete an API key permanently
   */
  async deleteApiKey(keyId: string, userId: string): Promise<void> {
    const result = await this.mcpApiKeyRepository.delete({ id: keyId, userId });

    if (result.affected === 0) {
      throw new EntityNotFoundException(
        'MCP API key not found',
        LogContext.MCP_SERVER,
        { keyId }
      );
    }

    this.logger.verbose?.(
      `Deleted MCP API key: ${keyId}`,
      LogContext.MCP_SERVER
    );
  }

  /**
   * Generate a secure random API key
   * Format: mcp_<random_base64url>
   */
  private generateApiKey(): string {
    const randomPart = randomBytes(32).toString('base64url');
    return `mcp_${randomPart}`;
  }

  /**
   * Hash an API key using SHA-256
   */
  private hashApiKey(plainTextKey: string): string {
    return createHash('sha256').update(plainTextKey).digest('hex');
  }
}

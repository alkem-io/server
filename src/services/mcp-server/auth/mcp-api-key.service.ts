import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { McpApiKeyScope } from '../dto/mcp.types';
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

@Injectable()
export class McpApiKeyService {
  constructor(
    @InjectRepository(McpApiKey)
    private readonly mcpApiKeyRepository: Repository<McpApiKey>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
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
      // Idempotent: re-assert it is active and ACTOR-bound — and clear any
      // `userId` so the userId/actorId XOR (trust-anchor invariant) holds even if
      // the matching-hash row was previously a user-bound key. Otherwise no-op.
      if (
        !existing.isActive ||
        existing.actorId !== actorId ||
        existing.userId
      ) {
        existing.isActive = true;
        existing.actorId = actorId;
        existing.userId = null as unknown as undefined; // NULL the column (TypeORM skips `undefined`)
        return this.mcpApiKeyRepository.save(existing);
      }
      return existing;
    }

    const apiKey = new McpApiKey();
    apiKey.name = name;
    apiKey.actorId = actorId;
    apiKey.keyHash = keyHash;
    apiKey.scopes = scopes;
    apiKey.isActive = true;
    const saved = await this.mcpApiKeyRepository.save(apiKey);

    this.logger.verbose?.(
      `Ensured actor-bound MCP API key ${saved.id} for actor ${actorId}`,
      LogContext.MCP_SERVER
    );
    return saved;
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

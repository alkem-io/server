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
  userId: string;
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

    const apiKey = new McpApiKey();
    apiKey.name = input.name;
    apiKey.description = input.description;
    apiKey.userId = input.userId;
    apiKey.keyHash = keyHash;
    apiKey.scopes = input.scopes || [{ operations: ['read'] }];
    apiKey.expiresAt = input.expiresAt;
    apiKey.isActive = true;

    const saved = await this.mcpApiKeyRepository.save(apiKey);

    this.logger.verbose?.(
      `Created MCP API key: ${saved.id} for user: ${input.userId}`,
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

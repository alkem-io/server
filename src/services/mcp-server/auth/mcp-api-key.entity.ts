import {
  MID_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
  UUID_LENGTH,
} from '@common/constants';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Column, Entity, Index } from 'typeorm';
import { McpApiKeyScope } from '../dto/mcp.types';

/**
 * Entity for storing MCP API keys.
 * Keys are stored as SHA-256 hashes for security.
 */
@Entity()
export class McpApiKey extends BaseAlkemioEntity {
  @Column('varchar', { length: SMALL_TEXT_LENGTH })
  @Index({ unique: true })
  keyHash!: string;

  @Column('varchar', { length: SMALL_TEXT_LENGTH })
  name!: string;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: true })
  description?: string;

  /**
   * The User this key authenticates as (`buildForUser`). Retained for the
   * existing user-bound api-key path. EXACTLY ONE of `userId` / `actorId` is set:
   * a user-bound key sets `userId`; an actor-bound key (the `virtual-assistant`
   * actor, 004-web-ai-assistant T027) sets `actorId` instead.
   */
  @Column('uuid', { nullable: true })
  @Index()
  userId?: string;

  /**
   * The Actor this key authenticates as (`buildForActor`) — generalizes the
   * auth seam off the hardcoded User UUID (004-web-ai-assistant T027). Set for
   * the system-invoked `virtual-assistant` actor credential (Flow B / FR-019);
   * null for an ordinary user-bound key.
   */
  @Column('uuid', { nullable: true })
  @Index()
  actorId?: string;

  @Column('jsonb', { nullable: false })
  scopes!: McpApiKeyScope[];

  @Column('timestamp', { nullable: true })
  expiresAt?: Date;

  @Column('timestamp', { nullable: true })
  lastUsedAt?: Date;

  @Column('varchar', { length: UUID_LENGTH, nullable: true })
  lastUsedFromIp?: string;

  @Column('boolean')
  isActive!: boolean;
}

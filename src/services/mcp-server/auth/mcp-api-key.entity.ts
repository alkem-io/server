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

  @Column('uuid')
  @Index()
  userId!: string;

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

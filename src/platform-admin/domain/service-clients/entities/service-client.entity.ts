import { User } from '@domain/community/user/user.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { ServiceClientScope } from './service-client-scope.entity';

export type ServiceClientStatus = 'enabled' | 'disabled';
export type ServiceClientTokenEndpointAuthMethod =
  | 'client_secret_basic'
  | 'client_secret_post';

/**
 * 004 T011 — `service_client` TypeORM entity (data-model.md §2).
 *
 * Catalogue row for an OAuth2 `client_credentials` machine-to-machine
 * client. **Append-only with respect to `client_id`** (FR-004) — status
 * transitions are the only mutation pattern; no DELETE is ever issued by
 * 004 code. Secret material is held by Hydra (no secret column).
 *
 * `nameNormalised` is a Postgres generated column (lower+trim) used as
 * the uniqueness key per Clarifications Session 2026-05-18; `name`
 * retains the original admin-supplied casing for display.
 *
 * Mutability matrix (data-model §2):
 *   - mutable: `ownerUserId`, `description`, `status`, `lastRotatedAt`,
 *     `lastStatusChangedAt`
 *   - immutable post-registration: everything else (revoke + re-register
 *     to change)
 */
@Entity('service_client')
@Index('idx_service_client_status_created_at', ['status', 'createdAt'])
@Index('idx_service_client_owner_user_id', ['ownerUserId'])
export class ServiceClient {
  @PrimaryColumn({ name: 'client_id', type: 'varchar', length: 63 })
  clientId!: string;

  @Column('varchar', { length: 255, nullable: false })
  name!: string;

  /**
   * Postgres-generated column: `lower(trim(name))`. Insert-time it is
   * supplied by the DB; on read we expose it for the uniqueness lookup
   * (clients comparing the normalised key without re-running the
   * normaliser).
   */
  @Column({
    name: 'name_normalised',
    type: 'varchar',
    length: 255,
    nullable: false,
    insert: false,
    update: false,
  })
  nameNormalised!: string;

  @Column('uuid', { name: 'owner_user_id', nullable: false })
  ownerUserId!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_user_id' })
  ownerUser?: User;

  @Column('text', { nullable: false, default: '' })
  description!: string;

  @Column('varchar', { length: 63, nullable: false })
  audience!: string;

  @Column('integer', {
    name: 'access_token_lifetime_seconds',
    nullable: false,
  })
  accessTokenLifetimeSeconds!: number;

  @Column('varchar', {
    name: 'token_endpoint_auth_method',
    length: 32,
    nullable: false,
  })
  tokenEndpointAuthMethod!: ServiceClientTokenEndpointAuthMethod;

  @Column('varchar', { length: 16, nullable: false })
  status!: ServiceClientStatus;

  @Column('timestamptz', {
    name: 'created_at',
    nullable: false,
    default: () => 'now()',
  })
  createdAt!: Date;

  @Column('uuid', { name: 'created_by_user_id', nullable: false })
  createdByUserId!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser?: User;

  @Column('timestamptz', { name: 'last_rotated_at', nullable: true })
  lastRotatedAt?: Date | null;

  @Column('timestamptz', { name: 'last_status_changed_at', nullable: true })
  lastStatusChangedAt?: Date | null;

  @OneToMany(
    () => ServiceClientScope,
    scope => scope.serviceClient
  )
  scopes?: ServiceClientScope[];
}

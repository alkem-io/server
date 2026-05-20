import { User } from '@domain/community/user/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

/**
 * 004 T011 — `platform_scope` TypeORM entity (data-model.md §4).
 *
 * Curated catalogue row. The DB enforces the `<resource>:<verb>` shape
 * via a CHECK constraint and the non-empty `description` via another;
 * the application layer mirrors both in DTO validators on the
 * `addPlatformScope` GraphQL input (Phase 4 onwards).
 *
 * `readOnlyBaseline = true` rows form the FR-005 default scope set
 * granted to a service-client when the admin omits an explicit scope
 * set on `registerServiceClient`. Toggled via
 * `setPlatformScopeBaselineMembership`.
 */
@Entity('platform_scope')
export class PlatformScope {
  @PrimaryColumn('varchar', { length: 63 })
  name!: string;

  @Column('text', { nullable: false })
  description!: string;

  @Column('boolean', {
    name: 'read_only_baseline',
    nullable: false,
    default: false,
  })
  readOnlyBaseline!: boolean;

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
}

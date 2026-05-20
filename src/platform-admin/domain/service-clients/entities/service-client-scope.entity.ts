import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { PlatformScope } from './platform-scope.entity';
import { ServiceClient } from './service-client.entity';

/**
 * 004 T011 — `service_client_scope` TypeORM entity (data-model.md §3).
 *
 * Composite PK `(clientId, scopeName)`. Mutation patterns are
 * replace-on-update for FR-002a `updateServiceClientScopes` (full
 * replacement; diff computed before write and emitted on FR-020 audit)
 * and cascade-narrow for FR-007a `removePlatformScope` (FK cascades on
 * `scope_name`; application layer emits per-holder audit events before
 * the DB cascade fires).
 *
 * Empty configured set is admissible (a parked-client row with zero
 * scopes); FR-016 denies every operation under such a bearer.
 */
@Entity('service_client_scope')
export class ServiceClientScope {
  @PrimaryColumn({ name: 'client_id', type: 'varchar', length: 63 })
  clientId!: string;

  @PrimaryColumn({ name: 'scope_name', type: 'varchar', length: 63 })
  scopeName!: string;

  @Column('timestamptz', {
    name: 'granted_at',
    nullable: false,
    default: () => 'now()',
  })
  grantedAt!: Date;

  @ManyToOne(
    () => ServiceClient,
    sc => sc.scopes,
    {
      nullable: false,
      onDelete: 'RESTRICT',
    }
  )
  @JoinColumn({ name: 'client_id' })
  serviceClient?: ServiceClient;

  @ManyToOne(() => PlatformScope, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scope_name' })
  platformScope?: PlatformScope;
}

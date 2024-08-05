import { Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { IAccount } from '@domain/space/account/account.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Space } from '../space/space.entity';
import { Agent } from '@domain/agent/agent/agent.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
@Entity()
export class Account extends AuthorizableEntity implements IAccount {
  @OneToOne(() => Space, {
    eager: false,
    cascade: false, // important: each space looks after saving itself! Same as space.subspaces field
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  space?: Space;

  @OneToOne(() => Agent, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  agent?: Agent;

  @OneToOne(() => StorageAggregator, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageAggregator?: StorageAggregator;

  @OneToMany(() => VirtualContributor, contributor => contributor.account, {
    eager: false,
    cascade: true,
  })
  virtualContributors!: VirtualContributor[];

  @OneToMany(() => InnovationHub, hub => hub.account, {
    eager: false,
    cascade: true,
  })
  innovationHubs!: InnovationHub[];

  @OneToMany(() => InnovationPack, innovationPack => innovationPack.account, {
    eager: false,
    cascade: true,
  })
  innovationPacks!: InnovationPack[];
}

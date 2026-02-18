import { ENUM_LENGTH, NAMEID_MAX_LENGTH_SCHEMA } from '@common/constants';
import { AccountType } from '@common/enums/account.type';
import { ActorType } from '@common/enums/actor.type';
import { Actor } from '@domain/actor/actor/actor.entity';
import { License } from '@domain/common/license/license.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { IAccount } from '@domain/space/account/account.interface';
import { IAccountLicensePlan } from '@domain/space/account.license.plan';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { ChildEntity, Column, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { Space } from '../space/space.entity';

@ChildEntity(ActorType.ACCOUNT)
export class Account extends Actor implements IAccount {
  // Account uses License instead of Profile, so profile will be null

  @Column('varchar', {
    length: NAMEID_MAX_LENGTH_SCHEMA,
    nullable: false,
    unique: true,
  })
  nameID!: string;

  // Renamed from 'type' to avoid conflict with Actor.type discriminator column
  @Column('varchar', { length: ENUM_LENGTH, nullable: true, name: 'type' })
  accountType!: AccountType;

  @Column('varchar', { length: ENUM_LENGTH, nullable: true })
  externalSubscriptionID?: string;

  @OneToMany(
    () => Space,
    space => space.account,
    {
      eager: false,
      cascade: false,
    }
  )
  spaces!: Space[];

  @Column('jsonb', { nullable: false })
  baselineLicensePlan!: IAccountLicensePlan;

  @OneToOne(() => License, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  license?: License;

  @OneToOne(() => StorageAggregator, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageAggregator?: StorageAggregator;

  @OneToMany(
    () => VirtualContributor,
    contributor => contributor.account,
    {
      eager: false,
      cascade: true,
    }
  )
  virtualContributors!: VirtualContributor[];

  @OneToMany(
    () => InnovationHub,
    hub => hub.account,
    {
      eager: false,
      cascade: true,
    }
  )
  innovationHubs!: InnovationHub[];

  @OneToMany(
    () => InnovationPack,
    innovationPack => innovationPack.account,
    {
      eager: false,
      cascade: true,
    }
  )
  innovationPacks!: InnovationPack[];
}

import { randomUUID } from 'node:crypto';
import { ENUM_LENGTH } from '@common/constants';
import { AccountType } from '@common/enums/account.type';
import { ActorType } from '@common/enums/actor.type';
import { Actor } from '@domain/actor/actor/actor.entity';
import { Credential } from '@domain/actor/credential/credential.entity';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { License } from '@domain/common/license/license.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { IAccount } from '@domain/space/account/account.interface';
import { IAccountLicensePlan } from '@domain/space/account.license.plan';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { Space } from '../space/space.entity';

@Entity('account')
export class Account extends BaseAlkemioEntity implements IAccount {
  constructor() {
    super();
    const id = randomUUID();
    this.id = id;
    const actor = new Actor();
    actor.type = ActorType.ACCOUNT;
    actor.id = id;
    this.actor = actor;
  }

  // Actor relation — shared primary key (account.id = actor.id)
  @OneToOne(() => Actor, {
    eager: true,
    cascade: true,
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'id', referencedColumnName: 'id' })
  actor?: Actor;

  // Transparent getters delegating to actor
  get type(): ActorType {
    return this.actor?.type as ActorType;
  }

  get authorization(): AuthorizationPolicy | undefined {
    return this.actor?.authorization;
  }

  set authorization(auth: AuthorizationPolicy | undefined) {
    if (!this.actor) this.actor = new Actor();
    this.actor.authorization = auth;
  }

  get credentials(): Credential[] | undefined {
    return this.actor?.credentials;
  }

  get profile(): Profile {
    return this.actor?.profile as Profile;
  }

  set profile(p: Profile) {
    if (!this.actor) this.actor = new Actor();
    this.actor.profile = p;
  }

  get nameID(): string {
    return this.actor?.nameID as string;
  }

  set nameID(val: string) {
    if (!this.actor) this.actor = new Actor();
    this.actor.nameID = val;
  }

  // DB column is named 'type'; TypeScript property is 'accountType' to avoid confusion with actor.type
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

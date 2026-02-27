import { randomUUID } from 'node:crypto';
import { ActorType } from '@common/enums/actor.type';
import { RoleSet } from '@domain/access/role-set/role.set.entity';
import { Actor } from '@domain/actor/actor/actor.entity';
import { Credential } from '@domain/actor/credential/credential.entity';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import {
  Column,
  Entity,
  Generated,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { IOrganizationSettings } from '../organization-settings/organization.settings.interface';
import { OrganizationVerification } from '../organization-verification/organization.verification.entity';
import { IOrganization } from './organization.interface';

@Entity('organization')
export class Organization
  extends BaseAlkemioEntity
  implements IOrganization, IGroupable
{
  constructor() {
    super();
    const id = randomUUID();
    this.id = id;
    const actor = new Actor();
    actor.type = ActorType.ORGANIZATION;
    actor.id = id;
    this.actor = actor;
  }

  // Actor relation — shared primary key (organization.id = actor.id)
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

  @Column('uuid', { nullable: false })
  accountID!: string;

  @Column('jsonb', { nullable: false })
  settings!: IOrganizationSettings;

  @Column({
    unique: true,
  })
  @Generated('increment')
  rowId!: number;

  @OneToMany(
    () => UserGroup,
    userGroup => userGroup.organization,
    {
      eager: false,
      cascade: true,
    }
  )
  groups?: UserGroup[];

  @Column()
  legalEntityName?: string = '';

  @Column()
  domain?: string = '';

  @Column()
  website?: string = '';

  @Column()
  contactEmail?: string = '';

  @OneToOne(() => OrganizationVerification, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  verification!: OrganizationVerification;

  @OneToOne(() => StorageAggregator, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageAggregator?: StorageAggregator;

  @OneToOne(() => RoleSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  roleSet!: RoleSet;
}

import { randomUUID } from 'node:crypto';
import { ENUM_LENGTH, NAMEID_MAX_LENGTH_SCHEMA } from '@common/constants';
import { ActorType } from '@common/enums/actor.type';
import { SpaceLevel } from '@common/enums/space.level';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { IPlatformRolesAccess } from '@domain/access/platform-roles-access/platform.roles.access.interface';
import { Actor } from '@domain/actor/actor/actor.entity';
import { Credential } from '@domain/actor/credential/credential.entity';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { License } from '@domain/common/license/license.entity';
import { Community } from '@domain/community/community/community.entity';
import { ISpace } from '@domain/space/space/space.interface';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { TemplatesManager } from '@domain/template/templates-manager';
import {
  Column,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Account } from '../account/account.entity';
import { SpaceAbout } from '../space.about';
import { ISpaceSettings } from '../space.settings/space.settings.interface';

@Entity('space')
export class Space extends BaseAlkemioEntity implements ISpace {
  // Actor relation — shared primary key (space.id = actor.id)
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

  // Space uses SpaceAbout instead of Profile, so profileId/profile are not applicable

  @Column('varchar', { length: NAMEID_MAX_LENGTH_SCHEMA, nullable: false })
  nameID!: string;

  @OneToMany(
    () => Space,
    space => space.parentSpace,
    {
      eager: false,
      cascade: false,
    }
  )
  subspaces?: Space[];

  @ManyToOne(
    () => Space,
    space => space.subspaces,
    {
      eager: false,
      cascade: false,
    }
  )
  parentSpace?: Space;

  @ManyToOne(
    () => Account,
    account => account.spaces,
    {
      eager: false,
      cascade: false,
      onDelete: 'SET NULL',
    }
  )
  account?: Account;

  @Column({
    unique: true,
  })
  @Generated('increment')
  rowId!: number;

  @OneToOne(() => Collaboration, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  collaboration?: Collaboration;

  @OneToOne(() => SpaceAbout, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  about!: SpaceAbout;

  @OneToOne(() => Community, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  community?: Community;

  @Column('jsonb', { nullable: false })
  settings: ISpaceSettings;

  // Calculated field to make the authorization logic clearer
  @Column('jsonb', { nullable: false })
  platformRolesAccess!: IPlatformRolesAccess;

  @OneToOne(() => StorageAggregator, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageAggregator?: StorageAggregator;

  @Column('uuid', { nullable: true })
  levelZeroSpaceID!: string;

  @Column('int', { nullable: false })
  level!: SpaceLevel;

  @Column('int', { nullable: false })
  sortOrder!: number;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
  })
  visibility!: SpaceVisibility;

  @OneToOne(() => TemplatesManager, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  templatesManager?: TemplatesManager;

  @OneToOne(() => License, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  license?: License;

  constructor() {
    super();
    const id = randomUUID();
    this.id = id;
    const actor = new Actor();
    actor.type = ActorType.SPACE;
    actor.id = id;
    this.actor = actor;
    this.nameID = '';
    this.settings = {} as ISpaceSettings;
    this.platformRolesAccess = { roles: [] } as IPlatformRolesAccess;
  }
}

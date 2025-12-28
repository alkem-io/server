import {
  Column,
  ChildEntity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { ISpace } from '@domain/space/space/space.interface';
import { ENUM_LENGTH, NAMEID_MAX_LENGTH_SCHEMA } from '@common/constants';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { Community } from '@domain/community/community/community.entity';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { Account } from '../account/account.entity';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { TemplatesManager } from '@domain/template/templates-manager';
import { License } from '@domain/common/license/license.entity';
import { SpaceLevel } from '@common/enums/space.level';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { Actor } from '@domain/actor/actor/actor.entity';
import { SpaceAbout } from '../space.about';
import { IPlatformRolesAccess } from '@domain/access/platform-roles-access/platform.roles.access.interface';
import { ActorType } from '@common/enums/actor.type';

@ChildEntity(ActorType.SPACE)
export class Space extends Actor implements ISpace {
  // Space uses SpaceAbout instead of Profile, so profile will be null

  @Column('varchar', { length: NAMEID_MAX_LENGTH_SCHEMA, nullable: false })
  nameID!: string;

  @OneToMany(() => Space, space => space.parentSpace, {
    eager: false,
    cascade: false,
  })
  subspaces?: Space[];

  @ManyToOne(() => Space, space => space.subspaces, {
    eager: false,
    cascade: false,
  })
  parentSpace?: Space;

  @ManyToOne(() => Account, account => account.spaces, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
  })
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

  // Space extends Actor - credentials are on Actor.credentials

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
    this.nameID = '';
    this.settings = {} as ISpaceSettings;
    this.platformRolesAccess = { roles: [] } as IPlatformRolesAccess;
  }
}

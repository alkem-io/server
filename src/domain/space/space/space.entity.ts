import {
  Column,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { ISpace } from '@domain/space/space/space.interface';
import {
  ENUM_LENGTH,
  NAMEID_MAX_LENGTH_SCHEMA,
  UUID_LENGTH,
} from '@common/constants';
import { SpaceType } from '@common/enums/space.type';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { Community } from '@domain/community/community/community.entity';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { Account } from '../account/account.entity';
import { Agent } from '@domain/agent/agent/agent.entity';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { TemplatesManager } from '@domain/template/templates-manager';
import { License } from '@domain/common/license/license.entity';
import { SpaceLevel } from '@common/enums/space.level';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { SpaceAbout } from '../space.about';
@Entity()
export class Space extends AuthorizableEntity implements ISpace {
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

  @OneToOne(() => Agent, { eager: false, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  agent?: Agent;

  @Column('json', { nullable: false })
  settings: ISpaceSettings;

  @OneToOne(() => StorageAggregator, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageAggregator?: StorageAggregator;

  @Column('varchar', { length: ENUM_LENGTH })
  type!: SpaceType;

  @Column('char', { length: UUID_LENGTH, nullable: true })
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
  }
}

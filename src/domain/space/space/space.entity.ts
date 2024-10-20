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
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { ENUM_LENGTH, UUID_LENGTH } from '@common/constants';
import { SpaceType } from '@common/enums/space.type';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { Community } from '@domain/community/community/community.entity';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { Account } from '../account/account.entity';
import { Context } from '@domain/context/context/context.entity';
import { Agent } from '@domain/agent/agent/agent.entity';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { SpaceDefaults } from '../space.defaults/space.defaults.entity';
import { Profile } from '@domain/common/profile';
@Entity()
export class Space extends NameableEntity implements ISpace {
  @OneToOne(() => Profile, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  profile!: Profile;

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

  @OneToOne(() => Context, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  context?: Context;

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

  @Column('text')
  settingsStr: string = '';

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
  level!: number;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
  })
  visibility!: SpaceVisibility;

  @OneToOne(() => TemplatesSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  library?: TemplatesSet;

  @OneToOne(() => SpaceDefaults, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  defaults?: SpaceDefaults;

  constructor() {
    super();
    this.nameID = '';
  }
}

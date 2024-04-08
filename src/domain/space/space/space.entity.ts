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
import { TINY_TEXT_LENGTH } from '@common/constants';
import { SpaceType } from '@common/enums/space.type';
import { Collaboration } from '@domain/collaboration/collaboration';
import { Community } from '@domain/community/community';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { Account } from '../account/account.entity';
import { Context } from '@domain/context/context/context.entity';
import { Agent } from '@domain/agent/agent/agent.entity';
@Entity()
export class Space extends NameableEntity implements ISpace {
  @OneToMany(() => Space, space => space.parentSpace, {
    eager: false,
    cascade: true,
  })
  subspaces?: Space[];

  @ManyToOne(() => Space, space => space.subspaces, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  parentSpace?: Space;

  // Note: no counter OneToMany as this is a pre ManyToOne relationship
  @ManyToOne(() => Account, {
    eager: true,
    cascade: false,
    onDelete: 'SET NULL',
  })
  account!: Account;

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

  @Column({
    length: TINY_TEXT_LENGTH,
  })
  type!: SpaceType;

  @Column('int', { nullable: false })
  level!: number;

  constructor() {
    super();
    this.nameID = '';
  }
}

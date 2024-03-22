/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Column, Generated, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { Community } from '@domain/community/community/community.entity';
import { Context } from '@domain/context/context/context.entity';
import { IBaseChallenge } from './base.challenge.interface';
import { Agent } from '@domain/agent/agent/agent.entity';
import { Collaboration } from '../../collaboration/collaboration/collaboration.entity';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { TINY_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { SpaceType } from '@common/enums/space.type';
import { Account } from '../account/account.entity';

export class BaseChallenge extends NameableEntity implements IBaseChallenge {
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

  constructor() {
    super();
    this.nameID = '';
  }
}

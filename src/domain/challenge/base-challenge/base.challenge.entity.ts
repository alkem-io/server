/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Column, Generated, JoinColumn, OneToOne } from 'typeorm';
import { Community } from '@domain/community/community/community.entity';
import { Context } from '@domain/context/context/context.entity';
import { IBaseChallenge } from './base.challenge.interface';
import { Agent } from '@domain/agent/agent/agent.entity';
import { Collaboration } from '../../collaboration/collaboration/collaboration.entity';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { Account } from '../account/account.entity';

export abstract class BaseChallenge
  extends NameableEntity
  implements IBaseChallenge
{
  @Column({
    unique: true,
  })
  @Generated('increment')
  rowId!: number;

  @OneToOne(() => Account, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  account!: Account;

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

  @OneToOne(() => StorageAggregator, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageAggregator?: StorageAggregator;

  constructor() {
    super();
    this.nameID = '';
  }
}

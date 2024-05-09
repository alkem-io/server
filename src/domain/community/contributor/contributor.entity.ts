/* eslint-disable @typescript-eslint/no-inferrable-types */
import { JoinColumn, OneToOne } from 'typeorm';
import { Agent } from '@domain/agent/agent/agent.entity';
import { IContributor } from './contributor.interface';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';

export class Contributor extends NameableEntity implements IContributor {
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
  }
}

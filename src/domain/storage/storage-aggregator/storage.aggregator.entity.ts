import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { IStorageAggregator } from './storage.aggregator.interface';
import { StorageBucket } from '../storage-bucket/storage.bucket.entity';

@Entity()
export class StorageAggregator
  extends AuthorizableEntity
  implements IStorageAggregator
{
  // The parent StorageAggregator can have many child StorageAggregators where it gathers storage; the relationship is controlled by the child.
  @ManyToOne(() => StorageAggregator, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
  })
  parentStorageAggregator?: StorageAggregator;

  @OneToOne(() => StorageBucket, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  directStorage!: StorageBucket;
}

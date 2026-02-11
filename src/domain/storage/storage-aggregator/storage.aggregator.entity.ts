import { ENUM_LENGTH } from '@common/constants';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { StorageBucket } from '../storage-bucket/storage.bucket.entity';
import { IStorageAggregator } from './storage.aggregator.interface';

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
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  directStorage?: StorageBucket;

  @Column('varchar', { length: ENUM_LENGTH, nullable: true })
  type!: StorageAggregatorType;
}

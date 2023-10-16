import { MimeFileType } from '@common/enums/mime.file.type';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { Document } from '../document/document.entity';
import { IStorageBucket } from './storage.bucket.interface';
import { StorageAggregator } from '../storage-aggregator/storage.aggregator.entity';

@Entity()
export class StorageBucket
  extends AuthorizableEntity
  implements IStorageBucket
{
  @OneToMany(() => Document, document => document.storageBucket, {
    eager: false,
    cascade: true,
  })
  documents!: Document[];

  // Each storage bucket has exactly one storage aggregator. Relationship is controlled by the child.
  @ManyToOne(() => StorageAggregator, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
  })
  storageAggregator?: StorageAggregator;

  @Column('simple-array')
  allowedMimeTypes!: MimeFileType[];

  @Column('int')
  maxFileSize!: number;
}

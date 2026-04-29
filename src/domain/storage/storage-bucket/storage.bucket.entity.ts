import { MimeFileType } from '@common/enums/mime.file.type';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { Document } from '../document/document.entity';
import { StorageAggregator } from '../storage-aggregator/storage.aggregator.entity';
import { IStorageBucket } from './storage.bucket.interface';

@Entity()
export class StorageBucket
  extends AuthorizableEntity
  implements IStorageBucket
{
  // Document is owned by file-service-go; the server's TypeORM is
  // read-only for the `file` table (enforced by DocumentWriteGuard).
  // `cascade: false` prevents repository.save(bucket) from walking into
  // bucket.documents and emitting UPDATE/INSERT — every Document write
  // must go through FileServiceAdapter. The in-memory `documents` array
  // is still read/mutated for state coherence within a request.
  @OneToMany(
    () => Document,
    document => document.storageBucket,
    {
      eager: false,
      cascade: false,
    }
  )
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

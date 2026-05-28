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
  //
  // `cascade: false` alone is NOT enough — TypeORM's OneToManySubjectBuilder
  // walks every OneToMany relation regardless of cascade, diffs the
  // database state against the in-memory `documents` array, and synthesizes
  // UPDATE subjects for any binding changes (or even loaded-but-unmodified
  // entries reached during diff). This bypasses cascade and triggers
  // DocumentWriteGuard on any save() that walks through StorageBucket
  // (profile cascade, aggregator cascade, mediaGallery cascade).
  //
  // `persistence: false` is the documented TypeORM switch that fully
  // disables that bidirectional FK management for this relation, leaving
  // the `documents` collection as a pure read-side projection. The DB FK
  // is owned by file-service-go and updated via FileServiceAdapter; the
  // physical-row cascade is preserved by `onDelete: 'CASCADE'` on the
  // Document side.
  @OneToMany(
    () => Document,
    document => document.storageBucket,
    {
      eager: false,
      cascade: false,
      persistence: false,
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

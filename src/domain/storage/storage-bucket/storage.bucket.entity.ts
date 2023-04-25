import { MimeFileType } from '@common/enums/mime.file.type';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { Document } from '../document/document.entity';
import { IStorageBucket } from './storage.bucket.interface';

@Entity()
export class StorageBucket extends AuthorizableEntity implements IStorageBucket {
  @OneToMany(() => Document, document => document.storageBucket, {
    eager: false,
    cascade: true,
  })
  documents!: Document[];

  // The parent StorageBucket can have many child StorageSpces; the relationship is controlled by the child.
  @ManyToOne(() => StorageBucket, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
  })
  parentStorageBucket?: StorageBucket;

  @Column('simple-array')
  allowedMimeTypes!: MimeFileType[];

  @Column('int')
  maxFileSize!: number;
}

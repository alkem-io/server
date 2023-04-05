import { MimeFileType } from '@common/enums/mime.file.type';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { Document } from '../document/document.entity';
import { IStorageSpace } from './storage.space.interface';

@Entity()
export class StorageSpace extends AuthorizableEntity implements IStorageSpace {
  @OneToMany(() => Document, document => document.storageSpace, {
    eager: false,
    cascade: true,
  })
  documents!: Document[];

  // The parent StorageSpace can have many child StorageSpces; the relationship is controlled by the child.
  @ManyToOne(() => StorageSpace, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
  })
  parentStorageSpace?: StorageSpace;

  @Column('simple-array')
  allowedMimeTypes!: MimeFileType[];

  @Column('int')
  maxFileSize!: number;
}

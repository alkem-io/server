import { Column, Entity, ManyToOne } from 'typeorm';
import { IDocument } from './document.interface';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { StorageSpace } from '../storage-space/storage.space.entity';
import { MimeFileType } from '@common/enums/mime.file.type';

@Entity()
export class Document extends NameableEntity implements IDocument {
  @Column('varchar', { length: 36, nullable: true })
  createdBy!: string;

  @ManyToOne(() => StorageSpace, storage => storage.documents, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  storageSpace!: StorageSpace;

  @Column('varchar', { length: 36, default: '' })
  mimeType!: MimeFileType;

  @Column('int')
  size!: number;

  @Column('varchar', { length: 128, default: '' })
  externalID!: string;
}

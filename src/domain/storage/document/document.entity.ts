import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { IDocument } from './document.interface';
import { StorageBucket } from '../storage-bucket/storage.bucket.entity';
import { MimeFileType } from '@common/enums/mime.file.type';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Tagset } from '@domain/common/tagset';
import { User } from '@domain/community/user/user.entity';

@Entity()
export class Document extends AuthorizableEntity implements IDocument {
  @OneToOne(() => User, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'createdBy' })
  createdBy!: string;

  @ManyToOne(() => StorageBucket, storage => storage.documents, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  storageBucket!: StorageBucket;

  @OneToOne(() => Tagset, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  tagset!: Tagset;

  @Column('text', { nullable: true })
  displayName = '';

  @Column('varchar', { length: 36, default: '' })
  mimeType!: MimeFileType;

  @Column('int')
  size!: number;

  @Column('varchar', { length: 128, default: '' })
  externalID!: string;
}

import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { IDocument } from './document.interface';
import { StorageBucket } from '../storage-bucket/storage.bucket.entity';
import { MimeFileType } from '@common/enums/mime.file.type';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Tagset } from '@domain/common/tagset';
import {
  ENUM_LENGTH,
  MID_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
} from '@common/constants';

@Entity()
export class Document extends AuthorizableEntity implements IDocument {
  // toDo fix createdBy circular dependency https://app.zenhub.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/gh/alkem-io/server/4529
  // omitting OneToOne decorator for createdBy to avoid circular dependency
  // needs a redesign to avoid circular dependency
  // @Index('FK_3337f26ca267009fcf514e0e726')
  // @OneToOne(() => User, {
  //   eager: false,
  //   cascade: true,
  //   onDelete: 'SET NULL',
  // })
  // @JoinColumn()
  @Column('uuid', { nullable: true })
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

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: false })
  displayName!: string;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  mimeType!: MimeFileType;

  @Column('int', { nullable: false })
  size!: number;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: false })
  externalID!: string;

  @Column('boolean', { nullable: false, default: false })
  temporaryLocation!: boolean;
}

import { MimeFileType } from '@common/enums/mime.file.type';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Tagset } from '@domain/common/tagset';
import { StorageBucket } from '../storage-bucket/storage.bucket.entity';
import { IDocument } from './document.interface';

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
  createdBy?: string;

  storageBucket!: StorageBucket;

  tagset!: Tagset;

  displayName!: string;

  mimeType!: MimeFileType;

  size!: number;

  externalID!: string;

  temporaryLocation!: boolean;
}

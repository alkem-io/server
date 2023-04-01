import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '@domain/common/entity/nameable-entity/nameable.interface';
import { IStorageSpace } from '../storage-space/storage.space.interface';
import { MimeFileType } from '@common/enums/mime.file.type';

@ObjectType('Document')
export abstract class IDocument extends INameable {
  storageSpace!: IStorageSpace;

  createdBy!: string;

  @Field(() => [MimeFileType], {
    description: 'Mime type for this Document.',
  })
  mimeType!: MimeFileType;

  @Field(() => Number, {
    description: 'Size of the Document.',
  })
  size!: number;

  externalID!: string;
}

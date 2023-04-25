import { Field, ObjectType } from '@nestjs/graphql';
import { IStorageBucket } from '../storage-bucket/storage.space.interface';
import { MimeFileType } from '@common/enums/mime.file.type';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ITagset } from '@domain/common/tagset/tagset.interface';

@ObjectType('Document')
export abstract class IDocument extends IAuthorizable {
  storageBucket!: IStorageBucket;

  @Field(() => ITagset, {
    nullable: false,
    description: 'The tagset in use on this Document.',
  })
  tagset!: ITagset;

  @Field(() => String, {
    nullable: false,
    description: 'The display name.',
  })
  displayName!: string;

  createdBy!: string;

  @Field(() => MimeFileType, {
    description: 'Mime type for this Document.',
  })
  mimeType!: MimeFileType;

  @Field(() => Number, {
    description: 'Size of the Document.',
  })
  size!: number;

  externalID!: string;
}

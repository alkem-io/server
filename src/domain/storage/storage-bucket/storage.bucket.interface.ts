import { MimeFileType } from '@common/enums/mime.file.type';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { Field, ObjectType } from '@nestjs/graphql';
import { IDocument } from '../document/document.interface';
import { IStorageAggregator } from '../storage-aggregator/storage.aggregator.interface';

@ObjectType('StorageBucket')
export abstract class IStorageBucket extends IAuthorizable {
  documents!: IDocument[];

  @Field(() => [String], {
    description: 'Mime types allowed to be stored on this StorageBucket.',
  })
  allowedMimeTypes!: MimeFileType[];

  @Field(() => Number, {
    description: 'Maximum allowed file size on this StorageBucket.',
  })
  maxFileSize!: number;

  storageAggregator?: IStorageAggregator;
}

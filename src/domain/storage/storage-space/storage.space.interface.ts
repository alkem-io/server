import { MimeFileType } from '@common/enums/mime.file.type';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { Field, ObjectType } from '@nestjs/graphql';
import { IDocument } from '../document/document.interface';

@ObjectType('StorageSpace')
export abstract class IStorageSpace extends IAuthorizable {
  documents!: IDocument[];

  @Field(() => [String], {
    description: 'Mime types allowed to be stored on this StorageSpace.',
  })
  allowedMimeTypes!: MimeFileType[];

  @Field(() => Number, {
    description: 'Maximum allowed file size on this StorageSpace.',
  })
  maxFileSize!: number;
}

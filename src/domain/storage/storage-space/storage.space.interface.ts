import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType } from '@nestjs/graphql';
import { IDocument } from '../document/document.interface';

@ObjectType('Storage')
export abstract class IStorageSpace extends IAuthorizable {
  documents?: IDocument[];
}

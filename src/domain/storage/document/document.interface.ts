import { ObjectType } from '@nestjs/graphql';
import { INameable } from '@domain/common/entity/nameable-entity/nameable.interface';
import { IStorageSpace } from '../storage-space/storage.space.interface';

@ObjectType('Document')
export abstract class IDocument extends INameable {
  storage?: IStorageSpace;

  createdBy!: string;
}

import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { ILibrary } from '@library/library/library.interface';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('Platform')
export abstract class IPlatform extends IAuthorizable {
  communication?: ICommunication;
  library?: ILibrary;

  storageBucket!: IStorageBucket;
}

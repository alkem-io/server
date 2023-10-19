import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('Library')
export abstract class ILibrary extends IAuthorizable {
  innovationPacks?: IInnovationPack[];

  storageAggregator!: IStorageAggregator;
}

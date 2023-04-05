import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IStorageSpace } from '@domain/storage/storage-space/storage.space.interface';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Library')
export abstract class ILibrary extends IAuthorizable {
  @Field(() => [IInnovationPack], {
    nullable: false,
    description: 'Platform level library.',
  })
  innovationPacks?: IInnovationPack[];

  storageSpace!: IStorageSpace;
}

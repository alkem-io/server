import { LogContext } from '@common/enums/logging.context';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ClassificationTagsetsLoaderCreator } from '@core/dataloader/creators/loader.creators/classification.tagsets.loader.creator';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IClassification } from './classification.interface';

@Resolver(() => IClassification)
export class ClassificationResolverFields {
  constructor() {}

  @ResolveField('tagsets', () => [ITagset], {
    nullable: true,
    description: 'The classification tagsets.',
  })
  async tagsets(
    @Parent() classification: IClassification,
    @Loader(ClassificationTagsetsLoaderCreator) loader: ILoader<ITagset[]>
  ): Promise<ITagset[]> {
    return loader.load(classification.id);
  }

  @ResolveField('tagset', () => ITagset, {
    nullable: true,
    description: 'The default or named tagset.',
  })
  async tagset(
    @Parent() classification: IClassification,
    @Args('tagsetName', {
      type: () => TagsetReservedName,
      nullable: false,
    })
    tagsetName: TagsetReservedName,
    @Loader(ClassificationTagsetsLoaderCreator)
    loader: ILoader<ITagset[]>
  ): Promise<ITagset> {
    const tagsets = await loader.load(classification.id);

    const namedTagset = tagsets.find(t => t.name === tagsetName);
    if (!namedTagset) {
      throw new EntityNotFoundException(
        `Unable to locate '${tagsetName}' tagset for Classification: ${classification.id}`,
        LogContext.PROFILE
      );
    }

    return namedTagset;
  }
}

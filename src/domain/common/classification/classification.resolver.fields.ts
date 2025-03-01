import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { IClassification } from './classification.interface';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ClassificationTagsetsLoaderCreator } from '@core/dataloader/creators/loader.creators/classification.tagsets.loader.creator';

@Resolver(() => IClassification)
export class ClassificationResolverFields {
  constructor() {}

  @UseGuards(GraphqlGuard)
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
}

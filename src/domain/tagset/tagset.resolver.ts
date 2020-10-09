import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { TagsInput } from './tagset.dto';
import { Tagset } from './tagset.entity';
import { TagsetService } from './tagset.service';

@Resolver()
export class TagsetResolver {
  constructor(private tagsetService: TagsetService) {}

  @Mutation(() => Tagset, {
    description: 'Replace the set of tags in a tagset with the provided tags',
  })
  async replaceTagsOnTagset(
    @Args('tagsetID') tagsetID: number,
    @Args('tags') newTags: TagsInput
  ): Promise<Tagset> {
    if (!newTags.tags)
      throw new Error(`Unable to replace tags on tagset(${tagsetID}`);

    const tagset = await this.tagsetService.replaceTags(tagsetID, newTags.tags);

    return tagset as Tagset;
  }
}

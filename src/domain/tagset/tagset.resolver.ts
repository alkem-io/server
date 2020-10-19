import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { TagsInput } from './tagset.dto';
import { Tagset } from './tagset.entity';
import { ITagset } from './tagset.interface';
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
  ): Promise<ITagset> {
    if (!newTags.tags)
      throw new Error(`Unable to replace tags on tagset(${tagsetID}`);

    const tagset = await this.tagsetService.replaceTags(tagsetID, newTags.tags);

    return tagset;
  }

  @Mutation(() => Tagset, {
    description: 'Add the provided tag to the tagset with the given ID',
  })
  async addTagToTagset(
    @Args('tagsetID') tagsetID: number,
    @Args('tag') newTag: string
  ): Promise<ITagset> {
    const tagset = await this.tagsetService.addTag(tagsetID, newTag);

    return tagset;
  }
}

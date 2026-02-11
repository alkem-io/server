import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ITagset } from './tagset.interface';
import { TagsetService } from './tagset.service';

@Resolver(() => ITagset)
export class TagsetResolverFields {
  constructor(private tagsetService: TagsetService) {}

  @ResolveField('allowedValues', () => [String], {
    nullable: false,
    description: 'The allowed values for this Tagset.',
  })
  async allowedValues(@Parent() tagset: ITagset): Promise<string[]> {
    return await this.tagsetService.getAllowedValuesOrFail(tagset);
  }
}

import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { TagsetService } from './tagset.service';
import { ITagset } from './tagset.interface';

@Resolver(() => ITagset)
export class TagsetResolverFields {
  constructor(private tagsetService: TagsetService) {}

  @ResolveField('allowedValues', () => [String], {
    nullable: false,
    description: 'The allowed values for this Tagset.',
  })
  async allowedValues(@Parent() tagset: ITagset): Promise<string[]> {
    return await this.tagsetService.getAllowedValues(tagset);
  }
}

import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Roles } from '@src/core/authorization/roles.decorator';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Tagset } from './tagset.entity';
import { TagsetService } from './tagset.service';
import { ITagset } from './tagset.interface';
import { Profiling } from '@src/core/logging/logging.profiling.decorator';
import { ValidationException } from '@src/common/error-handling/exceptions';
import { LogContext } from '@src/core/logging/logging.contexts';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';

@Resolver(() => Tagset)
export class TagsetResolver {
  constructor(private tagsetService: TagsetService) {}

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Tagset, {
    description: 'Replace the set of tags in a tagset with the provided tags',
  })
  @Profiling.api
  async replaceTagsOnTagset(
    @Args('tagsetID') tagsetID: number,
    @Args({ name: 'tags', type: () => [String] }) newTags: string[]
  ): Promise<ITagset> {
    if (!newTags)
      throw new ValidationException(
        `Unable to replace tags on tagset(${tagsetID}`,
        LogContext.COMMUNITY
      );

    return await this.tagsetService.replaceTags(tagsetID, newTags);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Tagset, {
    description: 'Add the provided tag to the tagset with the given ID',
  })
  @Profiling.api
  async addTagToTagset(
    @Args('tagsetID') tagsetID: number,
    @Args({ name: 'tag', type: () => String }) newTag: string
  ): Promise<ITagset> {
    return await this.tagsetService.addTag(tagsetID, newTag);
  }
}

import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UUID } from '@domain/common/scalars';
import { UseGuards } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { IDiscussion } from '../forum-discussion/discussion.interface';
import { DiscussionsInput } from './dto/forum.dto.discussions.input';
import { IForum } from './forum.interface';
import { ForumService } from './forum.service';

@Resolver(() => IForum)
export class ForumResolverFields {
  constructor(private forumService: ForumService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('discussions', () => [IDiscussion], {
    nullable: true,
    description: 'The Discussions active in this Forum.',
  })
  @Profiling.api
  async discussions(
    @Parent() forum: IForum,
    @Args('queryData', { type: () => DiscussionsInput, nullable: true })
    queryData?: DiscussionsInput
  ): Promise<IDiscussion[]> {
    return await this.forumService.getDiscussions(
      forum,
      queryData?.limit,
      queryData?.orderBy
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('discussion', () => IDiscussion, {
    nullable: true,
    description: 'A particular Discussions active in this Forum.',
  })
  @Profiling.api
  async discussion(
    @Parent() forum: IForum,
    @Args({
      name: 'ID',
      type: () => UUID,
      description: 'The ID of the Discussion to return',
      nullable: false,
    })
    discussionID: string
  ): Promise<IDiscussion> {
    return await this.forumService.getDiscussionOrFail(forum, discussionID);
  }
}

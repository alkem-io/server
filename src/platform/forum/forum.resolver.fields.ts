import { AuthorizationPrivilege } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { GraphqlGuard } from '@core/authorization';
import { ContributorFilterInput } from '@core/filtering/input-types';
import { IActorFull } from '@domain/actor/actor/actor.interface';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { UUID } from '@domain/common/scalars';
import { UseGuards } from '@nestjs/common';
import { Args, Int, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationActorHasPrivilege,
  Profiling,
} from '@src/common/decorators';
import { IDiscussion } from '../forum-discussion/discussion.interface';
import { DiscussionsInput } from './dto/forum.dto.discussions.input';
import { IForum } from './forum.interface';
import { ForumService } from './forum.service';

@Resolver(() => IForum)
export class ForumResolverFields {
  constructor(
    private forumService: ForumService,
    private actorLookupService: ActorLookupService
  ) {}

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('mentionableContributors', () => [IActorFull], {
    nullable: false,
    description:
      'Capped list of Contributors (Users, Virtual Contributors, …) that may be ' +
      '@mentioned in the platform Forum. The Forum is platform-wide, so all ' +
      'platform Contributors of the requested types are returned. Use `filter` ' +
      'for typeahead search and `types` to restrict which Contributor kinds are ' +
      'returned.',
  })
  async mentionableContributors(
    @Args('filter', { nullable: true }) filter?: ContributorFilterInput,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('types', { type: () => [ActorType], nullable: true })
    types?: ActorType[]
  ): Promise<IActorFull[]> {
    return this.actorLookupService.findMentionableContributors(
      { allPlatform: true },
      types,
      filter,
      limit
    );
  }
}

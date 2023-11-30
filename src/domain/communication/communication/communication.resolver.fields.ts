import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Args, Float, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { CommunicationService } from './communication.service';
import { AuthorizationPrivilege } from '@common/enums';
import { ICommunication } from './communication.interface';
import { IDiscussion } from '../discussion/discussion.interface';
import { DiscussionsOrderBy } from '@common/enums/discussions.orderBy';

@Resolver(() => ICommunication)
export class CommunicationResolverFields {
  constructor(private communicationService: CommunicationService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('discussions', () => [IDiscussion], {
    nullable: true,
    description: 'The Discussions active in this Communication.',
  })
  @Profiling.api
  async discussions(
    @Parent() communication: ICommunication,
    @Args({
      name: 'limit',
      type: () => Float,
      description:
        'The number of Discussions to return; if omitted return all Discussions.',
      nullable: true,
    })
    limit: number,
    @Args({
      name: 'orderBy',
      type: () => DiscussionsOrderBy,
      description: 'The sort order of the Discussions to return.',
      nullable: true,
    })
    orderBy: DiscussionsOrderBy
  ): Promise<IDiscussion[]> {
    return await this.communicationService.getDiscussions(
      communication,
      limit,
      orderBy
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('discussion', () => IDiscussion, {
    nullable: true,
    description: 'A particular Discussions active in this Communication.',
  })
  @Profiling.api
  async discussion(
    @Parent() communication: ICommunication,
    @Args('ID') discussionID: string
  ): Promise<IDiscussion> {
    return await this.communicationService.getDiscussionOrFail(
      communication,
      discussionID
    );
  }
}

import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { CommunicationService } from './communication.service';
import { AuthorizationPrivilege } from '@common/enums';
import { ICommunication } from './communication.interface';
import { IDiscussion } from '../discussion/discussion.interface';
import { DiscussionsInput } from './dto/communication.dto.discussions.input';

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

    @Args('queryData', { type: () => DiscussionsInput, nullable: true })
    queryData: DiscussionsInput | undefined
  ): Promise<IDiscussion[]> {
    return await this.communicationService.getDiscussions(
      communication,
      queryData?.limit,
      queryData?.orderBy
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

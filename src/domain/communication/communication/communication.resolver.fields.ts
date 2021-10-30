import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { CommunicationService } from './communication.service';
import { AuthorizationPrivilege } from '@common/enums';
import { ICommunication } from './communication.interface';
import { IDiscussion } from '../discussion/discussion.interface';
import { IUpdates } from '../updates/updates.interface';

@Resolver(() => ICommunication)
export class CommunicationResolverFields {
  constructor(private communicationService: CommunicationService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('updates', () => IUpdates, {
    nullable: true,
    description: 'Update messages for this communication.',
  })
  @Profiling.api
  async updates(@Parent() communication: ICommunication): Promise<IUpdates> {
    return await this.communicationService.getUpdates(communication);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('discussions', () => [IDiscussion], {
    nullable: true,
    description: 'The Discussions active in this Communication.',
  })
  @Profiling.api
  async discussions(
    @Parent() communication: ICommunication
  ): Promise<IDiscussion[]> {
    return await this.communicationService.getDiscussions(communication);
  }
}

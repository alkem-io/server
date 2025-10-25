import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { IConversationsSet } from './conversations.set.interface';
import { AuthorizationAgentPrivilege } from '@common/decorators/authorization.agent.privilege';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ConversationsSetService } from './conversations.set.service';

@Resolver(() => IConversationsSet)
export class ConversationsSetResolverFields {
  constructor(private conversationsSetService: ConversationsSetService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('conversationsCount', () => Number, {
    nullable: false,
    description: 'The count of Conversations for this ConversationsSet object.',
  })
  async conversationsCount(@Parent() conversationsSet: IConversationsSet) {
    return await this.conversationsSetService.getConversationsCount(
      conversationsSet.id
    );
  }
}

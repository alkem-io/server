import { Resolver, ResolveField, Parent, Args } from '@nestjs/graphql';
import { MeConversationsResult } from './dto/me.conversations.result';
import { IConversation } from '@domain/communication/conversation/conversation.interface';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { ConversationsSetService } from '@domain/communication/conversations-set/conversations.set.service';
import { CurrentUser } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { ValidationException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';

@Resolver(() => MeConversationsResult)
export class MeConversationsResolverFields {
  constructor(
    private conversationsSetService: ConversationsSetService,
    private userLookupService: UserLookupService
  ) {}

  @ResolveField(() => [IConversation], {
    nullable: false,
    description:
      'Conversations between users for the current authenticated user.',
  })
  async users(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() _parent: MeConversationsResult
  ): Promise<IConversation[]> {
    if (!agentInfo.userID) {
      throw new ValidationException(
        'Unable to retrieve conversations as no userID provided.',
        LogContext.COMMUNICATION
      );
    }
    const user = await this.userLookupService.getUserOrFail(agentInfo.userID, {
      relations: {
        conversationsSet: true,
      },
    });
    if (!user.conversationsSet) {
      throw new ValidationException(
        `User(${agentInfo.userID}) does not have a conversations set.`,
        LogContext.COMMUNICATION
      );
    }

    return await this.conversationsSetService.getUserConversations(
      user.conversationsSet.id
    );
  }

  @ResolveField(() => [IConversation], {
    nullable: false,
    description:
      'Conversations between users and virtual contributors for the current authenticated user.',
  })
  async virtualContributors(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() _parent: MeConversationsResult
  ): Promise<IConversation[]> {
    if (!agentInfo.userID) {
      throw new ValidationException(
        'Unable to retrieve conversations as no userID provided.',
        LogContext.COMMUNICATION
      );
    }
    const user = await this.userLookupService.getUserOrFail(agentInfo.userID, {
      relations: {
        conversationsSet: true,
      },
    });
    if (!user.conversationsSet) {
      throw new ValidationException(
        `User(${agentInfo.userID}) does not have a conversations set.`,
        LogContext.COMMUNICATION
      );
    }

    return await this.conversationsSetService.getVcConversations(
      user.conversationsSet.id
    );
  }

  @ResolveField(() => IConversation, {
    nullable: true,
    description:
      'Get a conversation with a well-known virtual contributor for the current user.',
  })
  async virtualContributor(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() _parent: MeConversationsResult,
    @Args('wellKnown', { type: () => VirtualContributorWellKnown })
    wellKnown: VirtualContributorWellKnown
  ): Promise<IConversation | undefined> {
    if (!agentInfo.userID) {
      throw new ValidationException(
        'Unable to retrieve conversation as no userID provided.',
        LogContext.COMMUNICATION
      );
    }

    return await this.conversationsSetService.getConversationWithWellKnownVC(
      agentInfo.userID,
      wellKnown
    );
  }
}

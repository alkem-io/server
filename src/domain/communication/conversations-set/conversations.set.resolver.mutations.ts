import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IConversation } from '../conversation/conversation.interface';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ConversationAuthorizationService } from '../conversation/conversation.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ConversationService } from '../conversation/conversation.service';
import { CreateConversationOnConversationsSetInput } from './dto/conversations.set.dto.create.conversation';
import { InstrumentResolver } from '@src/apm/decorators';
import { ConversationsSetService } from './conversations.set.service';
import { ForbiddenException } from '@common/exceptions/forbidden.exception';
import { LogContext } from '@common/enums/logging.context';
import { IConversationsSet } from './conversations.set.interface';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';

@InstrumentResolver()
@Resolver()
export class ConversationsSetResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private conversationsSetService: ConversationsSetService,
    private conversationAuthorizationService: ConversationAuthorizationService,
    private conversationService: ConversationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => IConversation, {
    description: 'Create a new Conversation on the ConversationsSet.',
  })
  async createConversationOnConversationsSet(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('conversationData')
    conversationData: CreateConversationOnConversationsSetInput
  ): Promise<IConversation> {
    const conversationsSet =
      await this.conversationsSetService.getConversationsSetOrFail(
        conversationData.conversationsSetID
      );

    return this.createConversation(
      agentInfo,
      conversationsSet,
      conversationData
    );
  }

  private async createConversation(
    agentInfo: AgentInfo,
    conversationsSet: IConversationsSet,
    conversationData: CreateConversationOnConversationsSetInput
  ): Promise<IConversation> {
    // Check that the room is being created by one of the participating users
    if (!conversationData.userIDs.includes(agentInfo.userID)) {
      throw new ForbiddenException(
        `User ${agentInfo.userID} is not allowed to create a conversation for someone else`,
        LogContext.COLLABORATION
      );
    }

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      conversationsSet.authorization,
      AuthorizationPrivilege.CREATE, // TODO: tie this one down more
      `create conversation on conversations Set: ${conversationsSet.id}`
    );
    const conversation =
      await this.conversationsSetService.createConversationOnConversationsSet(
        conversationData
      );

    // conversation needs to be saved to apply the authorization policy
    await this.conversationService.save(conversation);

    const authorizations =
      await this.conversationAuthorizationService.applyAuthorizationPolicy(
        conversation.id,
        conversationsSet.authorization
      );
    await this.authorizationPolicyService.saveAll(authorizations);

    return await this.conversationService.getConversationOrFail(
      conversation.id
    );
  }

  @Mutation(() => IConversation, {
    nullable: true,
    description: 'Create a guidance chat room.',
  })
  async createChatGuidanceConversation(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IConversation | undefined> {
    const conversationsSet =
      await this.conversationsSetService.getPlatformConversationsSetOrFail();

    const conversationData: CreateConversationOnConversationsSetInput = {
      conversationsSetID: conversationsSet.id,
      userIDs: [agentInfo.userID],
      type: CommunicationConversationType.USER_VC,
      wellKnownVirtualContributor: VirtualContributorWellKnown.CHAT_GUIDANCE,
    };

    return await this.createConversation(
      agentInfo,
      conversationsSet,
      conversationData
    );
  }
}

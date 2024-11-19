import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { ChatGuidanceService } from './chat.guidance.service';
import { ChatGuidanceAnswerRelevanceInput } from './dto/chat.guidance.relevance.dto';
import { GuidanceReporterService } from '@services/external/elasticsearch/guidance-reporter';
import { ChatGuidanceInput } from './dto/chat.guidance.dto.input';
import { IMessageGuidanceQuestionResult } from '@domain/communication/message.guidance.question.result/message.guidance.question.result.interface';
import { RoomAuthorizationService } from '@domain/communication/room/room.service.authorization';
import { UserService } from '@domain/community/user/user.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IRoom } from '@domain/communication/room/room.interface';

@Resolver()
export class ChatGuidanceResolverMutations {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private chatGuidanceService: ChatGuidanceService,
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private roomAuthorizationService: RoomAuthorizationService,
    private userService: UserService,
    private guidanceReporterService: GuidanceReporterService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IRoom, {
    nullable: true,
    description: 'Create a guidance chat room.',
  })
  async createChatGuidanceRoom(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IRoom | undefined> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.ACCESS_INTERACTIVE_GUIDANCE,
      `Access interactive guidance: ${agentInfo.email}`
    );
    if (!this.chatGuidanceService.isGuidanceEngineEnabled()) {
      return undefined;
    }

    const user = await this.userService.getUserOrFail(agentInfo.userID, {
      relations: { authorization: true, guidanceRoom: true },
    });
    if (user.guidanceRoom) {
      // Return current room if it exists
      return user.guidanceRoom;
    }

    const roomCreated =
      await this.chatGuidanceService.createGuidanceRoom(agentInfo);

    if (roomCreated) {
      const roomAuthorization =
        this.roomAuthorizationService.applyAuthorizationPolicy(
          roomCreated,
          user.authorization
        );
      await this.authorizationPolicyService.saveAll([roomAuthorization]);
    }
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IMessageGuidanceQuestionResult, {
    nullable: false,
    description: 'Ask the chat engine for guidance.',
  })
  async askChatGuidanceQuestion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('chatData') chatData: ChatGuidanceInput
  ): Promise<IMessageGuidanceQuestionResult> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.ACCESS_INTERACTIVE_GUIDANCE,
      `Access interactive guidance: ${agentInfo.email}`
    );

    if (!this.chatGuidanceService.isGuidanceEngineEnabled()) {
      return {
        success: false,
        error: 'Guidance Engine not enabled',
        question: chatData.question,
      };
    }
    return this.chatGuidanceService.askQuestion(chatData, agentInfo);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description: 'Resets the interaction with the chat engine.',
  })
  @Profiling.api
  async resetChatGuidance(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<boolean> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.ACCESS_INTERACTIVE_GUIDANCE,
      `Access interactive guidance: ${agentInfo.email}`
    );
    if (!this.chatGuidanceService.isGuidanceEngineEnabled()) {
      return false;
    }
    return this.chatGuidanceService.resetUserHistory(agentInfo);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description: 'Resets the interaction with the chat engine.',
  })
  @Profiling.api
  async ingest(@CurrentUser() agentInfo: AgentInfo): Promise<boolean> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `Access interactive guidance: ${agentInfo.email}`
    );
    if (!this.chatGuidanceService.isGuidanceEngineEnabled()) {
      return false;
    }
    return this.chatGuidanceService.ingest(agentInfo);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description: 'User vote if a specific answer is relevant.',
  })
  @Profiling.api
  public updateAnswerRelevance(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('input') { id, relevant }: ChatGuidanceAnswerRelevanceInput
  ): Promise<boolean> {
    return this.guidanceReporterService.updateAnswerRelevance(id, relevant);
  }
}

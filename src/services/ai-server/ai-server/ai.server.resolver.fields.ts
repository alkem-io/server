import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
} from '@src/common/decorators';
import { IAiServer } from './ai.server.interface';
import { AiServerService } from './ai.server.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IAiPersonaService } from '@services/ai-server/ai-persona-service';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { AiPersonaServiceInvocationInput } from '../ai-persona-service/dto/ai.persona.service.invocation.dto.input';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AiPersonaServiceService } from '../ai-persona-service/ai.persona.service.service';
import { IMessageAnswerToQuestion } from '@domain/communication/message.answer.to.question/message.answer.to.question.interface';
import { InteractionMessage } from '../ai-persona-service/dto/interaction.message';

@Resolver(() => IAiServer)
export class AiServerResolverFields {
  constructor(
    private aiServerService: AiServerService,
    private aiPersonaServiceService: AiPersonaServiceService
  ) {}

  @ResolveField('authorization', () => IAuthorizationPolicy, {
    description: 'The authorization policy for the aiServer',
    nullable: false,
  })
  authorization(@Parent() aiServer: IAiServer): IAuthorizationPolicy {
    return this.aiServerService.getAuthorizationPolicy(aiServer);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('defaultAiPersonaService', () => IAiPersonaService, {
    nullable: false,
    description: 'The default AiPersonaService in use on the aiServer.',
  })
  @UseGuards(GraphqlGuard)
  async defaultAiPersonaService(): Promise<IAiPersonaService> {
    return await this.aiServerService.getDefaultAiPersonaServiceOrFail();
  }

  @ResolveField(() => [IAiPersonaService], {
    nullable: false,
    description: 'The AiPersonaServices on this aiServer',
  })
  async aiPersonaServices(): Promise<IAiPersonaService[]> {
    return await this.aiServerService.getAiPersonaServices();
  }

  @ResolveField(() => IAiPersonaService, {
    nullable: false,
    description: 'A particular AiPersonaService',
  })
  async aiPersonaService(
    @Args('ID', { type: () => UUID, nullable: false }) id: string
  ): Promise<IAiPersonaService> {
    return await this.aiServerService.getAiPersonaServiceOrFail(id);
  }

  // @UseGuards(GraphqlGuard)
  // @ResolveField(() => IMessageAnswerToQuestion, {
  //   nullable: false,
  //   description: 'Ask the virtual persona engine for guidance.',
  // })
  // async askAiPersonaServiceQuestion(
  //   @CurrentUser() agentInfo: AgentInfo,
  //   @Args('aiPersonaQuestionInput')
  //   aiPersonaQuestionInput: AiPersonaServiceQuestionInput
  // ): Promise<IMessageAnswerToQuestion> {
  //   aiPersonaQuestionInput.userID =
  //     aiPersonaQuestionInput.userID ?? agentInfo.userID;
  //   // hardcode empty history for now; read it from the interaction
  //   const history: InteractionMessage[] = [];
  //   return this.aiPersonaServiceService.askQuestion(
  //     aiPersonaQuestionInput,
  //     history
  //   );
  // }
}

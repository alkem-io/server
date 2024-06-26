import { UUID_NAMEID } from '@domain/common/scalars';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { IVirtualContributor } from './virtual.contributor.interface';
import { VirtualContributorService } from './virtual.contributor.service';
import { ContributorQueryArgs } from '../contributor/dto/contributor.query.args';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization';
import { IAiPersonaQuestionResult } from '../ai-persona/dto/ai.persona.question.dto.result';
import { AiPersonaQuestionInput } from '../ai-persona/dto/ai.persona.question.dto.input';
import { AiPersonaService } from '../ai-persona/ai.persona.service';

@Resolver()
export class VirtualContributorResolverQueries {
  constructor(
    private virtualContributorService: VirtualContributorService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private aiPersonaService: AiPersonaService
  ) {}

  @UseGuards(GraphqlGuard)
  @Query(() => [IVirtualContributor], {
    nullable: false,
    description: 'The VirtualContributors on this platform',
  })
  @Profiling.api
  async virtualContributors(
    @Args({ nullable: true }) args: ContributorQueryArgs,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IVirtualContributor[]> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();

    const hasAccess = this.authorizationService.isAccessGranted(
      agentInfo,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN
    );

    if (!hasAccess) {
      return [];
    }
    return await this.virtualContributorService.getVirtualContributors(args);
  }

  @Query(() => IVirtualContributor, {
    nullable: false,
    description: 'A particular VirtualContributor',
  })
  @Profiling.api
  async virtualContributor(
    @Args('ID', { type: () => UUID_NAMEID, nullable: false }) id: string
  ): Promise<IVirtualContributor> {
    return await this.virtualContributorService.getVirtualContributorOrFail(id);
  }

  @UseGuards(GraphqlGuard)
  @Query(() => IAiPersonaQuestionResult, {
    nullable: false,
    description: 'Ask the virtual persona engine for guidance.',
  })
  async askAiPersonaQuestion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('chatData') chatData: AiPersonaQuestionInput
  ): Promise<IAiPersonaQuestionResult> {
    return this.aiPersonaService.askQuestion(chatData, agentInfo, '');
  }
}

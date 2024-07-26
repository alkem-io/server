import { UUID_NAMEID } from '@domain/common/scalars';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { IVirtualContributor } from './virtual.contributor.interface';
import { VirtualContributorService } from './virtual.contributor.service';
import { ContributorQueryArgs } from '../contributor/dto/contributor.query.args';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization';
import { VirtualContributorQuestionInput } from './dto/virtual.contributor.dto.question.input';
import { IMessageAnswerToQuestion } from '@domain/communication/message.answer.to.question/message.answer.to.question.interface';

@Resolver()
export class VirtualContributorResolverQueries {
  constructor(
    private virtualContributorService: VirtualContributorService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService
  ) {}

  @UseGuards(GraphqlGuard)
  @Query(() => [IVirtualContributor], {
    nullable: false,
    description: 'The VirtualContributors on this platform',
  })
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

  @UseGuards(GraphqlGuard)
  @Query(() => IVirtualContributor, {
    nullable: false,
    description: 'A particular VirtualContributor',
  })
  async virtualContributor(
    @Args('ID', { type: () => UUID_NAMEID, nullable: false }) id: string
  ): Promise<IVirtualContributor> {
    return await this.virtualContributorService.getVirtualContributorOrFail(id);
  }

  @UseGuards(GraphqlGuard)
  @Query(() => IMessageAnswerToQuestion, {
    nullable: false,
    description: 'Ask the virtual contributor a question directly.',
  })
  async askVirtualContributorQuestion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('virtualContributorQuestionInput')
    virtualContributorQuestionInput: VirtualContributorQuestionInput
  ): Promise<IMessageAnswerToQuestion> {
    const virtualContributor =
      await this.virtualContributorService.getVirtualContributorOrFail(
        virtualContributorQuestionInput.virtualContributorID
      );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtualContributor.authorization,
      AuthorizationPrivilege.READ,
      `asking a question to virtual contributor (${virtualContributor.id}): $chatData.question`
    );
    virtualContributorQuestionInput.userID =
      virtualContributorQuestionInput.userID ?? agentInfo.userID;
    return this.virtualContributorService.askQuestion(
      virtualContributorQuestionInput
    );
  }
}

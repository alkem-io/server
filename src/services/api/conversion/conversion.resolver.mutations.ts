import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConversionService } from './conversion.service';
import { IHub } from '@domain/challenge/hub/hub.interface';
import { AuthorizationRoleGlobal } from '@common/enums/authorization.credential.global';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ConvertChallengeToHubInput } from './dto/convert.dto.challenge.to.hub.input';
import { HubAuthorizationService } from '@domain/challenge/hub/hub.service.authorization';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { ConvertOpportunityToChallengeInput } from './dto/convert.dto.opportunity.to.challenge.input';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { HubService } from '@domain/challenge/hub/hub.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { GLOBAL_POLICY_CONVERSION_GLOBAL_ADMINS } from '@common/constants/authorization/authorization.constants';

@Resolver()
export class ConversionResolverMutations {
  private authorizationGlobalAdminPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private conversionService: ConversionService,
    private hubAuthorizationService: HubAuthorizationService,
    private hubService: HubService,
    private opportunityService: OpportunityService,
    private challengeService: ChallengeService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.authorizationGlobalAdminPolicy =
      this.authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
        [
          AuthorizationRoleGlobal.GLOBAL_ADMIN,
          AuthorizationRoleGlobal.GLOBAL_ADMIN_HUBS,
        ],
        [AuthorizationPrivilege.CREATE_HUB, AuthorizationPrivilege.CREATE],
        GLOBAL_POLICY_CONVERSION_GLOBAL_ADMINS
      );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IHub, {
    description: 'Creates a new Hub by converting an existing Challenge.',
  })
  @Profiling.api
  async convertChallengeToHub(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('convertData') convertChallengeToHubData: ConvertChallengeToHubInput
  ): Promise<IHub> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.CREATE_HUB,
      `convert challenge to hub: ${agentInfo.email}`
    );
    const newHub = await this.conversionService.convertChallengeToHub(
      convertChallengeToHubData,
      agentInfo
    );

    return await this.hubAuthorizationService.applyAuthorizationPolicy(newHub);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IChallenge, {
    description:
      'Creates a new Challenge by converting an existing Opportunity.',
  })
  @Profiling.api
  async convertOpportunityToChallenge(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('convertData')
    convertOpportunityToChallengeData: ConvertOpportunityToChallengeInput
  ): Promise<IChallenge> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      convertOpportunityToChallengeData.opportunityID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.CREATE,
      `convert opportunity to challenge: ${agentInfo.email}`
    );
    const newChallenge =
      await this.conversionService.convertOpportunityToChallenge(
        convertOpportunityToChallengeData.opportunityID,
        this.opportunityService.getHubID(opportunity),
        agentInfo
      );
    const parentHub = await this.hubService.getHubOrFail(
      this.challengeService.getHubID(newChallenge)
    );
    await this.hubAuthorizationService.applyAuthorizationPolicy(parentHub);
    return this.challengeService.getChallengeOrFail(newChallenge.id);
  }
}

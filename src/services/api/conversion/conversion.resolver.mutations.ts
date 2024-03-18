import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConversionService } from './conversion.service';
import { ISpace } from '@domain/challenge/space/space.interface';
import { AuthorizationRoleGlobal } from '@common/enums/authorization.credential.global';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ConvertChallengeToSpaceInput } from './dto/convert.dto.challenge.to.space.input';
import { SpaceAuthorizationService } from '@domain/challenge/space/space.service.authorization';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { ConvertOpportunityToChallengeInput } from './dto/convert.dto.opportunity.to.challenge.input';
import { OpportunityService } from '@domain/challenge/opportunity/opportunity.service';
import { SpaceService } from '@domain/challenge/space/space.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { GLOBAL_POLICY_CONVERSION_GLOBAL_ADMINS } from '@common/constants/authorization/global.policy.constants';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';

@Resolver()
export class ConversionResolverMutations {
  private authorizationGlobalAdminPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private conversionService: ConversionService,
    private spaceAuthorizationService: SpaceAuthorizationService,
    private spaceService: SpaceService,
    private opportunityService: OpportunityService,
    private challengeService: ChallengeService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.authorizationGlobalAdminPolicy =
      this.authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
        [
          AuthorizationRoleGlobal.GLOBAL_ADMIN,
          AuthorizationRoleGlobal.GLOBAL_ADMIN_SPACES,
        ],
        [AuthorizationPrivilege.CREATE_SPACE, AuthorizationPrivilege.CREATE],
        GLOBAL_POLICY_CONVERSION_GLOBAL_ADMINS
      );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpace, {
    description: 'Creates a new Space by converting an existing Challenge.',
  })
  @Profiling.api
  async convertChallengeToSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('convertData')
    convertChallengeToSpaceData: ConvertChallengeToSpaceInput
  ): Promise<ISpace> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.CREATE_SPACE,
      `convert challenge to space: ${agentInfo.email}`
    );
    const newSpace = await this.conversionService.convertChallengeToSpace(
      convertChallengeToSpaceData,
      agentInfo
    );

    return await this.spaceAuthorizationService.applyAuthorizationPolicy(
      newSpace
    );
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
      convertOpportunityToChallengeData.opportunityID,
      {
        relations: {
          account: {
            space: true,
          },
        },
      }
    );
    if (!opportunity.account) {
      throw new EntityNotInitializedException(
        `account not found on opportunity: ${opportunity.nameID}`,
        LogContext.CHALLENGES
      );
    }
    const spaceID = opportunity.account.space.id;
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.CREATE,
      `convert opportunity to challenge: ${agentInfo.email}`
    );
    const spaceStorageAggregator =
      await this.spaceService.getStorageAggregatorOrFail(spaceID);
    const newChallenge =
      await this.conversionService.convertOpportunityToChallenge(
        convertOpportunityToChallengeData.opportunityID,
        spaceID,
        agentInfo,
        spaceStorageAggregator
      );
    const parentSpace = await this.spaceService.getSpaceOrFail(spaceID);
    await this.spaceAuthorizationService.applyAuthorizationPolicy(parentSpace);
    return this.challengeService.getChallengeOrFail(newChallenge.id);
  }
}

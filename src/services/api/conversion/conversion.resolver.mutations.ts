import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConversionService } from './conversion.service';
import { ISpace } from '@domain/space/space/space.interface';
import { AuthorizationRoleGlobal } from '@common/enums/authorization.credential.global';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ConvertSubspaceToSpaceInput } from './dto/convert.dto.subspace.to.space.input';
import { SpaceAuthorizationService } from '@domain/space/space/space.service.authorization';
import { ConvertSubsubspaceToSubspaceInput } from './dto/convert.dto.subsubspace.to.subspace.input';
import { SpaceService } from '@domain/space/space/space.service';
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
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.authorizationGlobalAdminPolicy =
      this.authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
        [AuthorizationRoleGlobal.GLOBAL_ADMIN],
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
    convertChallengeToSpaceData: ConvertSubspaceToSpaceInput
  ): Promise<ISpace> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.CREATE_SPACE,
      `convert challenge to space: ${agentInfo.email}`
    );
    const newSpace = await this.conversionService.convertChallengeToSpace(
      convertChallengeToSpaceData,
      agentInfo
    );

    return this.spaceAuthorizationService
      .applyAuthorizationPolicy(newSpace)
      .then(space => this.spaceService.save(space));
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpace, {
    description:
      'Creates a new Challenge by converting an existing Opportunity.',
  })
  @Profiling.api
  async convertOpportunityToChallenge(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('convertData')
    convertOpportunityToChallengeData: ConvertSubsubspaceToSubspaceInput
  ): Promise<ISpace> {
    const subsubspace = await this.spaceService.getSpaceOrFail(
      convertOpportunityToChallengeData.subsubspaceID,
      {
        relations: {
          account: {
            space: true,
          },
        },
      }
    );
    if (!subsubspace.account || !subsubspace.account.space) {
      throw new EntityNotInitializedException(
        `account not found on opportunity: ${subsubspace.nameID}`,
        LogContext.SPACES
      );
    }
    const spaceID = subsubspace.account.space.id;
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.CREATE,
      `convert opportunity to challenge: ${agentInfo.email}`
    );
    const spaceStorageAggregator =
      await this.spaceService.getStorageAggregatorOrFail(spaceID);
    const newChallenge =
      await this.conversionService.convertOpportunityToChallenge(
        convertOpportunityToChallengeData.subsubspaceID,
        spaceID,
        agentInfo,
        spaceStorageAggregator
      );
    const parentSpace = await this.spaceService.getSpaceOrFail(spaceID, {
      relations: {
        account: {
          authorization: true,
        },
      },
    });
    await this.spaceAuthorizationService
      .applyAuthorizationPolicy(parentSpace)
      .then(space => this.spaceService.save(space));
    // return the latest, after the parent has saved
    return this.spaceService.getSpaceOrFail(newChallenge.id);
  }
}

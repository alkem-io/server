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
        [AuthorizationPrivilege.PLATFORM_ADMIN],
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
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `convert challenge to space: ${agentInfo.email}`
    );
    let space = await this.conversionService.convertChallengeToSpaceOrFail(
      convertChallengeToSpaceData,
      agentInfo
    );
    space = await this.spaceService.save(space);
    const updatedAuthorizations =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(space);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    return this.spaceService.getSpaceOrFail(space.id);
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
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.CREATE,
      `convert opportunity to challenge: ${agentInfo.email}`
    );
    let subspace =
      await this.conversionService.convertOpportunityToChallengeOrFail(
        convertOpportunityToChallengeData.subsubspaceID,
        agentInfo
      );
    subspace = await this.spaceService.save(subspace);
    const subspaceAuthorizations =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(subspace);
    await this.authorizationPolicyService.saveAll(subspaceAuthorizations);
    return await this.spaceService.getSpaceOrFail(subspace.id);
  }
}

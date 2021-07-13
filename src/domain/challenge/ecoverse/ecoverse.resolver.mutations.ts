import { CreateChallengeInput } from '@domain/challenge/challenge/dto/challenge.dto.create';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { UseGuards } from '@nestjs/common';
import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { EcoverseService } from './ecoverse.service';
import {
  CreateEcoverseInput,
  DeleteEcoverseInput,
  UpdateEcoverseInput,
} from '@domain/challenge/ecoverse';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationRoleGlobal } from '@common/enums';
import { AgentInfo } from '@core/authentication';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { EcoverseAuthorizationService } from './ecoverse.service.authorization';
import { ChallengeAuthorizationService } from '@domain/challenge/challenge/challenge.service.authorization';
import { IEcoverse } from './ecoverse.interface';
import { EcoverseAuthorizationResetInput } from './ecoverse.dto.reset.authorization';
import { IAuthorizationDefinition } from '@domain/common/authorization-definition';
@Resolver()
export class EcoverseResolverMutations {
  private globalAdminAuthorization: IAuthorizationDefinition;

  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private ecoverseService: EcoverseService,
    private ecoverseAuthorizationService: EcoverseAuthorizationService,
    private challengeAuthorizationService: ChallengeAuthorizationService
  ) {
    this.globalAdminAuthorization = this.authorizationEngine.createGlobalRolesAuthorizationDefinition(
      [AuthorizationRoleGlobal.Admin],
      [AuthorizationPrivilege.CREATE, AuthorizationPrivilege.UPDATE]
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IEcoverse, {
    description: 'Creates a new Ecoverse.',
  })
  @Profiling.api
  async createEcoverse(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ecoverseData') ecoverseData: CreateEcoverseInput
  ): Promise<IEcoverse> {
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      this.globalAdminAuthorization,
      AuthorizationPrivilege.CREATE,
      `updateEcoverse: ${ecoverseData.nameID}`
    );
    const ecoverse = await this.ecoverseService.createEcoverse(ecoverseData);
    return await this.ecoverseAuthorizationService.applyAuthorizationRules(
      ecoverse
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IEcoverse, {
    description: 'Updates the Ecoverse.',
  })
  @Profiling.api
  async updateEcoverse(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ecoverseData') ecoverseData: UpdateEcoverseInput
  ): Promise<IEcoverse> {
    const ecoverse = await this.ecoverseService.getEcoverseOrFail(
      ecoverseData.ID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      ecoverse.authorization,
      AuthorizationPrivilege.UPDATE,
      `updateEcoverse: ${ecoverse.nameID}`
    );

    // ensure working with UUID
    ecoverseData.ID = ecoverse.id;

    if (ecoverseData.authorizationDefinition) {
      await this.ecoverseAuthorizationService.updateAuthorizationDefinition(
        ecoverse,
        ecoverseData.authorizationDefinition
      );
    }

    return await this.ecoverseService.update(ecoverseData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IEcoverse, {
    description: 'Deletes the specified Ecoverse.',
  })
  async deleteEcoverse(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteEcoverseInput
  ): Promise<IEcoverse> {
    const ecoverse = await this.ecoverseService.getEcoverseOrFail(
      deleteData.ID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      ecoverse.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteEcoverse: ${ecoverse.nameID}`
    );
    return await this.ecoverseService.deleteEcoverse(deleteData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IChallenge, {
    description: 'Creates a new Challenge within the specified Ecoverse.',
  })
  @Profiling.api
  async createChallenge(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('challengeData') challengeData: CreateChallengeInput
  ): Promise<IChallenge> {
    const ecoverse = await this.ecoverseService.getEcoverseOrFail(
      challengeData.parentID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      ecoverse.authorization,
      AuthorizationPrivilege.CREATE,
      `challengeCreate: ${ecoverse.nameID}`
    );
    const challenge = await this.ecoverseService.createChallenge(challengeData);
    return await this.challengeAuthorizationService.applyAuthorizationRules(
      challenge,
      ecoverse.authorization
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IEcoverse, {
    description: 'Reset the AuthorizationDefinition on the specified Ecoverse.',
  })
  @Profiling.api
  async authorizationDefinitionResetOnEcoverse(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('authorizationResetData')
    authorizationResetData: EcoverseAuthorizationResetInput
  ): Promise<IEcoverse> {
    const ecoverse = await this.ecoverseService.getEcoverseOrFail(
      authorizationResetData.ecoverseID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      ecoverse.authorization,
      AuthorizationPrivilege.UPDATE,
      `reset authorization definition: ${agentInfo.email}`
    );
    return await this.ecoverseAuthorizationService.applyAuthorizationRules(
      ecoverse
    );
  }
}

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
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { EcoverseAuthorizationService } from './ecoverse.service.authorization';
import { ChallengeAuthorizationService } from '@domain/challenge/challenge/challenge.service.authorization';
import { IEcoverse } from './ecoverse.interface';
import { IUser } from '@domain/community/user/user.interface';
import { AssignEcoverseAdminInput } from './dto/ecoverse.dto.assign.admin';
import { RemoveEcoverseAdminInput } from './dto/ecoverse.dto.remove.admin';
import { EcoverseAuthorizationResetInput } from './dto/ecoverse.dto.reset.authorization';
import { CreateChallengeOnEcoverseInput } from '../challenge/dto/challenge.dto.create.in.ecoverse';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
@Resolver()
export class EcoverseResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private ecoverseService: EcoverseService,
    private ecoverseAuthorizationService: EcoverseAuthorizationService,
    private challengeAuthorizationService: ChallengeAuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IEcoverse, {
    description: 'Creates a new Ecoverse.',
  })
  @Profiling.api
  async createEcoverse(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ecoverseData') ecoverseData: CreateEcoverseInput
  ): Promise<IEcoverse> {
    const authorizatinoPolicy =
      this.authorizationPolicyService.getPlatformAuthorizationPolicy();
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizatinoPolicy,
      AuthorizationPrivilege.CREATE_HUB,
      `updateEcoverse: ${ecoverseData.nameID}`
    );
    const ecoverse = await this.ecoverseService.createEcoverse(
      ecoverseData,
      agentInfo
    );
    return await this.ecoverseAuthorizationService.applyAuthorizationPolicy(
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
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      ecoverse.authorization,
      AuthorizationPrivilege.UPDATE,
      `updateEcoverse: ${ecoverse.nameID}`
    );

    // ensure working with UUID
    ecoverseData.ID = ecoverse.id;

    if (ecoverseData.authorizationPolicy) {
      await this.ecoverseAuthorizationService.applyAuthorizationPolicy(
        ecoverse,
        ecoverseData.authorizationPolicy
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
    await this.authorizationService.grantAccessOrFail(
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
    @Args('challengeData') challengeData: CreateChallengeOnEcoverseInput
  ): Promise<IChallenge> {
    const ecoverse = await this.ecoverseService.getEcoverseOrFail(
      challengeData.ecoverseID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      ecoverse.authorization,
      AuthorizationPrivilege.CREATE,
      `challengeCreate: ${ecoverse.nameID}`
    );
    const challenge = await this.ecoverseService.createChallengeInEcoverse(
      challengeData,
      agentInfo
    );
    return await this.challengeAuthorizationService.applyAuthorizationPolicy(
      challenge,
      ecoverse.authorization
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IEcoverse, {
    description: 'Reset the Authorization Policy on the specified Ecoverse.',
  })
  @Profiling.api
  async authorizationPolicyResetOnEcoverse(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('authorizationResetData')
    authorizationResetData: EcoverseAuthorizationResetInput
  ): Promise<IEcoverse> {
    const ecoverse = await this.ecoverseService.getEcoverseOrFail(
      authorizationResetData.ecoverseID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      ecoverse.authorization,
      AuthorizationPrivilege.UPDATE,
      `reset authorization definition: ${agentInfo.email}`
    );
    return await this.ecoverseAuthorizationService.applyAuthorizationPolicy(
      ecoverse
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Assigns a User as an Ecoverse Admin.',
  })
  @Profiling.api
  async assignUserAsEcoverseAdmin(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: AssignEcoverseAdminInput
  ): Promise<IUser> {
    const ecoverse = await this.ecoverseService.getEcoverseOrFail(
      membershipData.ecoverseID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      ecoverse.authorization,
      AuthorizationPrivilege.GRANT,
      `assign user ecoverse admin: ${ecoverse.displayName}`
    );
    return await this.ecoverseService.assignEcoverseAdmin(membershipData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Removes a User from being an Ecoverse Admin.',
  })
  @Profiling.api
  async removeUserAsEcoverseAdmin(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: RemoveEcoverseAdminInput
  ): Promise<IUser> {
    const ecoverse = await this.ecoverseService.getEcoverseOrFail(
      membershipData.ecoverseID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      ecoverse.authorization,
      AuthorizationPrivilege.GRANT,
      `remove user ecoverse admin: ${ecoverse.displayName}`
    );
    return await this.ecoverseService.removeEcoverseAdmin(membershipData);
  }
}

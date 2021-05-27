import { CreateChallengeInput } from '@domain/challenge/challenge/challenge.dto.create';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { UseGuards } from '@nestjs/common';
import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { EcoverseService } from './ecoverse.service';
import {
  CreateEcoverseInput,
  DeleteEcoverseInput,
  IEcoverse,
  UpdateEcoverseInput,
} from '@domain/challenge/ecoverse';
import { AuthorizationGlobalRoles } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationRoleGlobal } from '@common/enums';
import { UserInfo } from '@core/authentication';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { EcoverseAuthorizationService } from './ecoverse.service.authorization';
import { ChallengeAuthorizationService } from '../challenge/challenge.service.authorization';
@Resolver()
export class EcoverseResolverMutations {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private ecoverseService: EcoverseService,
    private ecoverseAuthorizationService: EcoverseAuthorizationService,
    private challengeAuthorizationService: ChallengeAuthorizationService
  ) {}

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => IEcoverse, {
    description: 'Creates a new Ecoverse.',
  })
  @Profiling.api
  async createEcoverse(
    @Args('ecoverseData') ecoverseData: CreateEcoverseInput
  ): Promise<IEcoverse> {
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
    @CurrentUser() userInfo: UserInfo,
    @Args('ecoverseData') ecoverseData: UpdateEcoverseInput
  ): Promise<IEcoverse> {
    const ecoverse = await this.ecoverseService.getEcoverseOrFail(
      ecoverseData.ID
    );
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      ecoverse.authorization,
      AuthorizationPrivilege.UPDATE,
      `updateEcoverse: ${ecoverse.nameID}`
    );

    const ctVerse = await this.ecoverseService.update(ecoverseData);
    return ctVerse;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IEcoverse, {
    description: 'Deletes the specified Ecoverse.',
  })
  async deleteEcoverse(
    @CurrentUser() userInfo: UserInfo,
    @Args('deleteData') deleteData: DeleteEcoverseInput
  ): Promise<IEcoverse> {
    const ecoverse = await this.ecoverseService.getEcoverseOrFail(
      deleteData.ID
    );
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
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
    @CurrentUser() userInfo: UserInfo,
    @Args('challengeData') challengeData: CreateChallengeInput
  ): Promise<IChallenge> {
    const ecoverse = await this.ecoverseService.getEcoverseOrFail(
      challengeData.parentID
    );
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
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
}

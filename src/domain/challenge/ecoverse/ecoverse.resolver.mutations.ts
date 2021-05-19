import { CreateChallengeInput } from '@domain/challenge/challenge/challenge.dto.create';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { Inject, UseGuards } from '@nestjs/common';
import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { EcoverseService } from './ecoverse.service';
import {
  CreateEcoverseInput,
  IEcoverse,
  UpdateEcoverseInput,
} from '@domain/challenge/ecoverse';
import { AuthorizationGlobalRoles } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationRoleGlobal } from '@common/enums';
@Resolver()
export class EcoverseResolverMutations {
  constructor(
    @Inject(EcoverseService) private ecoverseService: EcoverseService
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
    return await this.ecoverseService.createEcoverse(ecoverseData);
  }

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => IEcoverse, {
    description: 'Updates the Ecoverse.',
  })
  @Profiling.api
  async updateEcoverse(
    @Args('ecoverseData') ecoverseData: UpdateEcoverseInput
  ): Promise<IEcoverse> {
    const ctVerse = await this.ecoverseService.update(ecoverseData);
    return ctVerse;
  }

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => IChallenge, {
    description: 'Creates a new Challenge within the specified Ecoverse.',
  })
  @Profiling.api
  async createChallenge(
    @Args('challengeData') challengeData: CreateChallengeInput
  ): Promise<IChallenge> {
    const challenge = await this.ecoverseService.createChallenge(challengeData);

    return challenge;
  }
}

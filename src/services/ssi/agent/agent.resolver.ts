import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { SsiAgentService } from './agent.service';
import { AuthorizationGlobalRoles, Profiling } from '@common/decorators';
import {
  AuthorizationRolesGlobal,
  AuthorizationRulesGuard,
} from '@core/authorization';

@Resolver()
export class SsiAgentResolver {
  constructor(private agentService: SsiAgentService) {}

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(AuthorizationRulesGuard)
  @Mutation(() => Boolean, {
    description:
      'Assigns the StateModification credential to a particular user for a particular challenge',
  })
  @Profiling.api
  async authoriseStateModification(
    @Args('userID') userID: number,
    @Args('challengeID') challengeID: number
  ): Promise<boolean> {
    const success = await this.agentService.authoriseStateModification(
      userID,
      challengeID
    );
    return success;
  }
}

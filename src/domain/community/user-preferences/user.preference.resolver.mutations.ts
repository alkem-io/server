import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AgentInfo } from '@src/core/authentication';
import { GraphqlGuard } from '@src/core/authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege, CurrentUser, Profiling } from '@src/common';
import { UpdateUserPreferenceInput } from './dto';
import { UserPreferenceService } from './user.preference.service';
import { IUserPreference } from './user.preference.interface';

@Resolver(() => IUserPreference)
export class UserPreferenceResolverMutations {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly preferenceService: UserPreferenceService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUserPreference, {
    description: 'Updates an user preference',
  })
  @Profiling.api
  async updateUserPreference(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('userPreferenceData') userPreferenceData: UpdateUserPreferenceInput
  ) {
    const preference = await this.preferenceService.getUserPreferenceOrFail(
      userPreferenceData.id
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      preference.authorization,
      AuthorizationPrivilege.UPDATE,
      `user preference update: ${preference.id}`
    );
    return this.preferenceService.updateUserPreference(userPreferenceData);
  }
}

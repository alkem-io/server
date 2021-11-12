import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { IUserPreference } from '@domain/community/user-preferences/user.preference.interface';
import { UseGuards } from '@nestjs/common';
import { AgentInfo, GraphqlGuard } from '@src/core';
import { AuthorizationPrivilege, CurrentUser, Profiling } from '@src/common';
import { UpdateUserPreferenceInput } from '@domain/community/user-preferences/dto';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserPreferenceService } from '@src/domain';

@Resolver(() => IUserPreference)
export class UserPreferenceResolverMutations {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly userAuthorizationService: UserAuthorizationService,
    private readonly preferenceService: UserPreferenceService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUserPreference, {
    description: 'Updates an user preference',
  })
  @Profiling.api
  async updateUserPreference(
    @CurrentUser() agentInfo: AgentInfo,
    @Args() userPreferenceData: UpdateUserPreferenceInput
  ) {
    const preference = await this.preferenceService.getUserPreferenceOrFail(
      userPreferenceData.userId,
      userPreferenceData.userPreferenceType
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

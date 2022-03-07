import { Inject, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication';
import { ClientProxy } from '@nestjs/microservices';
import { NOTIFICATIONS_SERVICE } from '@common/constants/providers';
import { PreferenceService } from '@domain/common/preferences/preference.service';
import { IPreference } from '@domain/common/preferences/preference.interface';
import { UpdatePreferenceInput } from '@domain/common/preferences/dto/user-preference.dto.update';

@Resolver(() => IPreference)
export class PreferenceResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private readonly preferenceService: PreferenceService,
    @Inject(NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IPreference, {
    description: 'Updates a preference',
  })
  @Profiling.api
  async updatePreference(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('preferenceData') preferenceData: UpdatePreferenceInput
  ) {
    const preference = await this.preferenceService.getPreferenceOrFail(
      preferenceData.preferenceID
    );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      preference.authorization,
      AuthorizationPrivilege.UPDATE,
      `user preference update: ${preference.id}`
    );
    return await this.preferenceService.updatePreference(
      preference,
      preferenceData.value
    );
  }
}

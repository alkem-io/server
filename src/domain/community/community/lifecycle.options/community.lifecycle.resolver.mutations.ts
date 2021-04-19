import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { Roles } from '@common/decorators/roles.decorator';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Application, IApplication } from '@domain/community/application';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { CommunityLifecycleOptionsProvider } from './community.lifecycle.options.provider';
import { ApplicationLifecycleEventInput } from '@domain/community/application';

@Resolver()
export class CommuntiyLifecycleResolverMutations {
  constructor(
    private communityLifecycleOptionsProvider: CommunityLifecycleOptionsProvider
  ) {}

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Application, {
    description: 'Trigger an event on the Application.',
  })
  async eventOnApplication(
    @Args('applicationEventData')
    applicationEventData: ApplicationLifecycleEventInput
  ): Promise<IApplication> {
    return await this.communityLifecycleOptionsProvider.eventOnApplication(
      applicationEventData
    );
  }
}

import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { ActorContext } from '@core/actor-context';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { DeletePlatformInvitationInput } from './dto/platform.invitation.dto.delete';
import { PlatformInvitationService } from './platform.invitation.service';
import { IPlatformInvitation } from './platform.invitation.interface';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class PlatformInvitationResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private platformInvitationService: PlatformInvitationService
  ) {}

  @Mutation(() => IPlatformInvitation, {
    description: 'Removes the specified User platformInvitation.',
  })
  async deletePlatformInvitation(
    @CurrentUser() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeletePlatformInvitationInput
  ): Promise<IPlatformInvitation> {
    const platformInvitation =
      await this.platformInvitationService.getPlatformInvitationOrFail(
        deleteData.ID
      );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      platformInvitation.authorization,
      AuthorizationPrivilege.DELETE,
      `delete platformInvitation: ${platformInvitation.id}`
    );
    return await this.platformInvitationService.deletePlatformInvitation(
      deleteData
    );
  }
}

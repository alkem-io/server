import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { IUser } from '@domain/community/user/user.interface';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationActorPrivilege, Profiling } from '@src/common/decorators';
import { IPlatformInvitation } from './platform.invitation.interface';
import { PlatformInvitationService } from './platform.invitation.service';

@Resolver(() => IPlatformInvitation)
export class PlatformInvitationResolverFields {
  constructor(private platformInvitationService: PlatformInvitationService) {}

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('createdBy', () => IUser, {
    nullable: false,
    description: 'The User who created the platformInvitation.',
  })
  @Profiling.api
  async createdBy(
    @Parent() platformInvitation: IPlatformInvitation
  ): Promise<IUser> {
    return await this.platformInvitationService.getCreatedBy(
      platformInvitation
    );
  }
}

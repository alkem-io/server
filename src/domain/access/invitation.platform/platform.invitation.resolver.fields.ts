import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { PlatformInvitationService } from './platform.invitation.service';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { IUser } from '@domain/community/user/user.interface';
import { AuthorizationActorPrivilege, Profiling } from '@src/common/decorators';
import { IPlatformInvitation } from './platform.invitation.interface';

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

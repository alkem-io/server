import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { InvitationExternalService } from './invitation.external.service';
import { AuthorizationPrivilege } from '@common/enums';
import { IInvitationExternal } from '@domain/community/invitation.external/invitation.external.interface';
import { GraphqlGuard } from '@core/authorization';
import { IUser } from '@domain/community/user/user.interface';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';

@Resolver(() => IInvitationExternal)
export class InvitationExternalResolverFields {
  constructor(private invitationExternalService: InvitationExternalService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('createdBy', () => IUser, {
    nullable: false,
    description: 'The User who triggered the invitationExternal.',
  })
  @Profiling.api
  async createdBy(
    @Parent() invitationExternal: IInvitationExternal
  ): Promise<IUser> {
    return await this.invitationExternalService.getCreatedBy(
      invitationExternal
    );
  }
}

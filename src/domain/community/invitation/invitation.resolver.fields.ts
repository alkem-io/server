import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { InvitationService } from './invitation.service';
import { AuthorizationPrivilege } from '@common/enums';
import { IInvitation } from '@domain/community/invitation';
import { GraphqlGuard } from '@core/authorization';
import { IUser } from '@domain/community/user/user.interface';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';

@Resolver(() => IInvitation)
export class InvitationResolverFields {
  constructor(private invitationService: InvitationService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('user', () => IUser, {
    nullable: false,
    description: 'The User who is invited.',
  })
  @Profiling.api
  async invitedUser(@Parent() invitation: IInvitation): Promise<IUser> {
    return await this.invitationService.getInvitedUser(invitation);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('createdBy', () => IUser, {
    nullable: false,
    description: 'The User who triggered the invitation.',
  })
  @Profiling.api
  async createdBy(@Parent() invitation: IInvitation): Promise<IUser> {
    return await this.invitationService.getCreatedBy(invitation);
  }
}

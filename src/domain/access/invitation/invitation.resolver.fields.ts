import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { InvitationService } from './invitation.service';
import { AuthorizationPrivilege } from '@common/enums';
import { IInvitation } from '@domain/access/invitation';
import { GraphqlGuard } from '@core/authorization';
import { IUser } from '@domain/community/user/user.interface';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { IContributor } from '@domain/community/contributor/contributor.interface';

@Resolver(() => IInvitation)
export class InvitationResolverFields {
  constructor(private invitationService: InvitationService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('contributor', () => IContributor, {
    nullable: false,
    description: 'The Contributor who is invited.',
  })
  @Profiling.api
  async invitedContributor(
    @Parent() invitation: IInvitation
  ): Promise<IContributor> {
    return await this.invitationService.getInvitedContributor(invitation);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('createdBy', () => IUser, {
    nullable: true,
    description: 'The User who triggered the invitation.',
  })
  @Profiling.api
  async createdBy(@Parent() invitation: IInvitation): Promise<IUser | null> {
    try {
      return await this.invitationService.getCreatedByOrFail(invitation);
    } catch {
      return null;
    }
  }
}

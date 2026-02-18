import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { IInvitation } from '@domain/access/invitation';
import { IActor } from '@domain/actor/actor/actor.interface';
import { IUser } from '@domain/community/user/user.interface';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationActorPrivilege, Profiling } from '@src/common/decorators';
import { InvitationService } from './invitation.service';

@Resolver(() => IInvitation)
export class InvitationResolverFields {
  constructor(private invitationService: InvitationService) {}

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('contributor', () => IActor, {
    nullable: false,
    description: 'The Actor who is invited.',
  })
  @Profiling.api
  async invitedActor(@Parent() invitation: IInvitation): Promise<IActor> {
    return await this.invitationService.getInvitedActor(invitation);
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
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

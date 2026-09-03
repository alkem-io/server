import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { IInvitation } from '@domain/access/invitation';
import { IActor } from '@domain/actor/actor/actor.interface';
import { IUser } from '@domain/community/user/user.interface';
import { ISpaceAbout } from '@domain/space/space.about/space.about.interface';
import { forwardRef, Inject, UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationActorHasPrivilege,
  Profiling,
} from '@src/common/decorators';
import { RoleSetService } from '../role-set/role.set.service';
import { InvitationService } from './invitation.service';

@Resolver(() => IInvitation)
export class InvitationResolverFields {
  constructor(
    private invitationService: InvitationService,
    @Inject(forwardRef(() => RoleSetService))
    private roleSetService: RoleSetService
  ) {}

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('actor', () => IActor, {
    nullable: false,
    description: 'The Actor who is invited.',
  })
  @Profiling.api
  async invitedActor(@Parent() invitation: IInvitation): Promise<IActor> {
    return await this.invitationService.getInvitedActor(invitation);
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('spacesToJoinOnAccept', () => [ISpaceAbout], {
    nullable: false,
    description:
      'The Spaces that will be joined if this invitation is accepted, root Space first.',
  })
  @Profiling.api
  async spacesToJoinOnAccept(
    @Parent() invitation: IInvitation
  ): Promise<ISpaceAbout[]> {
    const roleSet =
      invitation.roleSet ??
      (
        await this.invitationService.getInvitationOrFail(invitation.id, {
          relations: { roleSet: true },
        })
      ).roleSet;
    if (!roleSet) {
      return [];
    }
    const spaces = await this.roleSetService.getSpacesToJoinOnAccept(
      roleSet,
      invitation.invitedActorID,
      invitation.invitedToParent
    );
    return spaces.map(space => space.about);
  }
}

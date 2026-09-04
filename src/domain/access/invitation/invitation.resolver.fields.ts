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

  // Gated on ROLESET_ENTRY_ROLE_INVITE_ACCEPT rather than the broader READ:
  // that privilege is granted only to account admins of the invited actor
  // (invitation.service.authorization.ts), the intended informed-consent
  // audience for previewing what accepting joins. Every other actor with
  // READ on the invitation (e.g. an inviter with visibility limited to an
  // immediate subspace) is excluded from this field, even though it can
  // read other invitation fields.
  @AuthorizationActorHasPrivilege(
    AuthorizationPrivilege.ROLESET_ENTRY_ROLE_INVITE_ACCEPT
  )
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
    // No per-Space READ_ABOUT filter here: the field-level gate above
    // already confines this resolver to the invited actor's own account
    // admins, and every Space returned by getSpacesToJoinOnAccept is one
    // that accepting this invitation actually joins. Filtering by the
    // current human admin's own READ_ABOUT would silently drop Spaces the
    // consenting organization is about to join whenever an ancestor is
    // private (the organization holds the membership, not the admin
    // reviewing on its behalf), producing exactly the empty-list /
    // cross-artifact mismatch this field exists to prevent — the same
    // audience already receives the identical Space list unfiltered via
    // email and `me.communityInvitations`.
    return spaces.map(space => space.about);
  }
}

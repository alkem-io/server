import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IInvitation } from '@domain/access/invitation';
import { IActor } from '@domain/actor/actor/actor.interface';
import { IUser } from '@domain/community/user/user.interface';
import { ISpaceAbout } from '@domain/space/space.about/space.about.interface';
import { forwardRef, Inject, UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationActorHasPrivilege,
  CurrentActor,
  Profiling,
} from '@src/common/decorators';
import { RoleSetService } from '../role-set/role.set.service';
import { InvitationService } from './invitation.service';

@Resolver(() => IInvitation)
export class InvitationResolverFields {
  constructor(
    private invitationService: InvitationService,
    private authorizationService: AuthorizationService,
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
    @Parent() invitation: IInvitation,
    @CurrentActor() actorContext: ActorContext
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
    // Defence in depth beyond the field-level gate above: an ancestor
    // Space's About carries the same private content a direct `Space.about`
    // read would refuse, so it is only included here when the current
    // actor actually holds READ_ABOUT on that specific Space.
    return spaces
      .filter(space =>
        this.authorizationService.isAccessGranted(
          actorContext,
          space.authorization,
          AuthorizationPrivilege.READ_ABOUT
        )
      )
      .map(space => space.about);
  }
}

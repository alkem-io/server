import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IInvitation, ISpaceJoinPreview } from '@domain/access/invitation';
import { IActor } from '@domain/actor/actor/actor.interface';
import { IUser } from '@domain/community/user/user.interface';
import { forwardRef, Inject, UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UrlGeneratorService } from '@services/infrastructure/url-generator';
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
    private roleSetService: RoleSetService,
    private urlGeneratorService: UrlGeneratorService
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
  //
  // The check is made INLINE and the field is NULLABLE rather than using
  // @AuthorizationActorHasPrivilege, which throws. This field is selected
  // from the shared `InvitationData` fragment that the top-bar pending
  // memberships dialog and the in-app notifications panel spread for every
  // invitation, including ones the viewer may read but not answer (an org
  // admin demoted to associate keeps the in-app row until it is cleaned
  // up). Throwing there would attach a GraphQL error to every notifications
  // fetch, and — under the non-null `CommunityInvitationResult.invitation`
  // — null out the whole `me` query. Not being allowed to preview the list
  // is an absence, not an error.
  @UseGuards(GraphqlGuard)
  @ResolveField('spacesToJoinOnAccept', () => [ISpaceJoinPreview], {
    nullable: true,
    description:
      "The Spaces that will be joined if this invitation is accepted, root Space first; null when the caller may not answer this invitation on the invited Actor's behalf.",
  })
  @Profiling.api
  async spacesToJoinOnAccept(
    @Parent() invitation: IInvitation,
    @CurrentActor() actorContext: ActorContext
  ): Promise<ISpaceJoinPreview[] | null> {
    // `isAccessGranted` delegates to `isAccessGratedForCredentials`, which
    // THROWS `EntityNotInitializedException` on an undefined policy rather
    // than returning false. The relation is eager but `onDelete: 'SET NULL'`,
    // so an invitation whose policy row was removed would otherwise throw —
    // reintroducing exactly the whole-`me`-query failure this nullable,
    // never-throwing design exists to prevent. No policy means no grant.
    if (!invitation.authorization) {
      return null;
    }
    if (
      !this.authorizationService.isAccessGranted(
        actorContext,
        invitation.authorization,
        AuthorizationPrivilege.ROLESET_ENTRY_ROLE_INVITE_ACCEPT
      )
    ) {
      return null;
    }
    // EVERYTHING below is best-effort. `getInvitationOrFail`,
    // `getParentRoleSet`, `isMember` and `getSpaceForRoleSetOrFail` all throw
    // on a row that has moved underneath the caller — a Space admin revoking
    // this very invitation while an org admin's dashboard `me` query is in
    // flight is a live race, and an uncaught throw here nulls out the whole
    // `me` payload (see the comment above). A preview that cannot be computed
    // is an absence, not an error, exactly as the authorization denial above
    // is. This mirrors the `createdBy` resolver in this same file.
    try {
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
      //
      // Because that filter is deliberately absent, this projection is the
      // disclosure boundary: display name and URL ONLY — byte for byte what
      // the email path already sends (notification.external.adapter.ts
      // `spacesToJoinPayload`) — instead of the whole `ISpaceAbout`, whose
      // `why` / `who` / `profile` / `guidelines` / `classifications` carry
      // no field-level gate of their own and would otherwise hand these
      // admins the private About content of every ancestor Space. See
      // ISpaceJoinPreview before adding a field here.
      return await Promise.all(
        spaces.map(async space => ({
          id: space.id,
          displayName: space.about.profile.displayName,
          url: await this.urlGeneratorService.generateUrlForProfile(
            space.about.profile
          ),
        }))
      );
    } catch {
      return null;
    }
  }
}

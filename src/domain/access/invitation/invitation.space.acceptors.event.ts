import { ActorType } from '@common/enums/actor.type';

/**
 * Emitted when an organization or virtual contributor invitation on a Space
 * RoleSet is created, changes state, or is deleted. Such an invitation is
 * accepted by the invitee's account admins, who see the Space while it is
 * open; that rule lives on the Space's own authorization policy, so the Space
 * must be reset. Emitted with `emitAsync`, so the reset has completed when the
 * mutation returns.
 */
export const SPACE_INVITATION_ACCEPTORS_CHANGED =
  'space.invitation.acceptors.changed';

export type SpaceInvitationAcceptorsChanged = { roleSetID: string };

/** An invitee whose invitation its account admins accept on its behalf. */
export const isAcceptedByAccountAdmins = (
  actorType: ActorType | null | undefined
): boolean =>
  actorType === ActorType.ORGANIZATION ||
  actorType === ActorType.VIRTUAL_CONTRIBUTOR;

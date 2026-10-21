import { ActorType } from '@common/enums/actor.type';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Emitted when an organization or virtual contributor invitation on a Space
 * RoleSet is created, changes state, or is deleted. Such an invitation is
 * accepted by the invitee's account admins, who see the Space while it is
 * open; that rule lives on the Space's own authorization policy, so the Space
 * must be reset. Emitted through {@link emitSpaceInvitationAcceptorsChanged}:
 * the reset has completed — or its failure has propagated — when that returns.
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

/** Resets the Space of each RoleSet, one at a time. */
export const emitSpaceInvitationAcceptorsChanged = async (
  eventEmitter: EventEmitter2,
  roleSetIDs: string[]
): Promise<void> => {
  for (const roleSetID of new Set(roleSetIDs)) {
    const event: SpaceInvitationAcceptorsChanged = { roleSetID };
    await eventEmitter.emitAsync(SPACE_INVITATION_ACCEPTORS_CHANGED, event);
  }
};

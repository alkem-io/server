import { NotificationInputBase } from '../notification.dto.input.base';

/**
 * An organization has become a member of a Space by accepting an
 * invitation. Notifies every ADMIN of the organization EXCEPT the one
 * who accepted (R33) — the welcome exists to tell *the others* that the
 * invitation is answered and no further action is needed, so telling the
 * acceptor they accepted informs nobody. `withoutAcceptor` in
 * `notification.organization.adapter.ts` applies that filter to all
 * three channels; where the acceptor is the organization's only admin
 * the event resolves to no recipients and is not sent.
 */
export interface NotificationInputOrganizationSpaceCommunityJoined
  extends NotificationInputBase {
  organizationID: string;
  spaceID: string;
}

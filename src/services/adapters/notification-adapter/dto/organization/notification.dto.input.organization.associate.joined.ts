import { CommunityMembershipOrigin } from '@common/enums/community.membership.origin';
import { NotificationInputBase } from '../notification.dto.input.base';

/**
 * A new associate joined the organization directly (application approval,
 * domain join, or a direct assignment from the tab) — never for an
 * invitation acceptance, whose response notification is the replacement
 * (FR-010). `membershipOrigin` decides that at the adapter, the single
 * owner of the suppress-on-INVITATION rule.
 */
export interface NotificationInputOrganizationAssociateJoined
  extends NotificationInputBase {
  organizationID: string;
  associateID: string;
  membershipOrigin: CommunityMembershipOrigin;
}

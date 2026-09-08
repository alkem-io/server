import { ActorType } from '@common/enums/actor.type';
import { CommunityMembershipOrigin } from '@common/enums/community.membership.origin';
import { ICommunity } from '@domain/community/community/community.interface';
import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputCommunityNewMember
  extends NotificationInputBase {
  actorID: string;
  actorType: ActorType;
  community: ICommunity;
  /**
   * How the membership came about. The member-side "welcome to the Space"
   * notification always fires; the Space-admin "a new member joined"
   * notification is suppressed for INVITATION only, which has its own outcome
   * notification to every admin of the Space. An approved application arrives
   * here as DIRECT and keeps the generic notification — there is no
   * application-approved event to replace it, so suppressing it would leave the
   * approving admin's co-admins told nothing at all (R31).
   */
  membershipOrigin?: CommunityMembershipOrigin;
}

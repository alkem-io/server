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
   * notification is suppressed for INVITATION and APPLICATION, which have
   * their own outcome notification to the admin concerned.
   */
  membershipOrigin?: CommunityMembershipOrigin;
}

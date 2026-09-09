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
   * notification is suppressed for anything other than DIRECT, because the
   * brief scopes it to memberships with no invitation or application step.
   */
  membershipOrigin?: CommunityMembershipOrigin;
}

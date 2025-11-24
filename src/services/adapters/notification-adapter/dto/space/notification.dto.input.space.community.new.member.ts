import { ICommunity } from '@domain/community/community/community.interface';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputCommunityNewMember
  extends NotificationInputBase {
  contributorID: string;
  contributorType: RoleSetContributorType;
  community: ICommunity;
}

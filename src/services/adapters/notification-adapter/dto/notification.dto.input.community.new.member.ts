import { ICommunity } from '@domain/community/community/community.interface';
import { NotificationInputBase } from './notification.dto.input.base';
import { CommunityContributorType } from '@common/enums/community.contributor.type';

export interface NotificationInputCommunityNewMember
  extends NotificationInputBase {
  contributorID: string;
  contributorType: CommunityContributorType;
  community: ICommunity;
}

import { CreateNVPInput } from '@domain/common/nvp/nvp.dto.create';
import { ICommunity } from '@domain/community/community/community.interface';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputCommunityContextReview
  extends NotificationInputBase {
  community: ICommunity;
  questions: CreateNVPInput[];
}

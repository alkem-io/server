import { BaseSubscriptionPayload } from '@src/common/interfaces';
import { IActivity } from '@platform/activity';

export interface ActivityCreatedSubscriptionPayload
  extends BaseSubscriptionPayload {
  activity: IActivity;
}

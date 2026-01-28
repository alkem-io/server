import { IActivity } from '@platform/activity';
import { BaseSubscriptionPayload } from '@src/common/interfaces';

export interface ActivityCreatedSubscriptionPayload
  extends BaseSubscriptionPayload {
  activity: IActivity;
}

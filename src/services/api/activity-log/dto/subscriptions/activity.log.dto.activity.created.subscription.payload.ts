import { BaseSubscriptionPayload } from '@src/common';
import { IActivity } from '@platform/activity';

export interface ActivityCreatedSubscriptionPayload
  extends BaseSubscriptionPayload {
  activity: IActivity;
}

import { IActivity } from '@platform/activity';
import { BaseSubscriptionPayload } from '@src/common/interfaces';

export interface ActivityCreatedSubscriptionPayload
  extends BaseSubscriptionPayload {
  collaborationID: string;
  activity: IActivity;
}

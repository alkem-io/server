import { BaseSubscriptionPayload } from '@interfaces/index';

export interface WhiteboardSavedSubscriptionPayload
  extends BaseSubscriptionPayload {
  whiteboardID: string;
  updatedDate: Date;
}

import { IAspect } from '@src/domain';
import { BaseSubscriptionPayload } from '@src/common';

export interface CalloutAspectCreatedPayload extends BaseSubscriptionPayload {
  calloutID: string;
  aspect: IAspect;
}

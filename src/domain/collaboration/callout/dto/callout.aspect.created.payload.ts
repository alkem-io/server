import { IAspect } from '@src/domain/collaboration/aspect/aspect.interface';
import { BaseSubscriptionPayload } from '@src/common/interfaces/base.subscription.payload.interface';

export interface CalloutAspectCreatedPayload extends BaseSubscriptionPayload {
  calloutID: string;
  aspect: IAspect;
}

import { PollEventType } from '@common/enums/poll.event.type';
import { BaseSubscriptionPayload } from '@src/common/interfaces/base.subscription.payload.interface';
import { IPoll } from '../poll.interface';

export interface PollSubscriptionPayload extends BaseSubscriptionPayload {
  pollEventType: PollEventType;
  poll: IPoll;
}

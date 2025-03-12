import { PubSubEngine } from 'graphql-subscriptions';
import { SubscriptionType } from '@common/enums/subscription.type';

export type TypedPubSubEngine<TPayload = unknown> = PubSubEngine & {
  publish: (triggerName: string, payload: TPayload) => Promise<void>;
  asyncIterator: (
    triggers: SubscriptionType | SubscriptionType[]
  ) => AsyncIterator<SubscriptionType>;
};

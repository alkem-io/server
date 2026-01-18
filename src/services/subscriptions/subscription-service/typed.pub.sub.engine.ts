import { SubscriptionType } from '@common/enums/subscription.type';
import { PubSubEngine } from 'graphql-subscriptions';

export type TypedPubSubEngine<TPayload = unknown> = PubSubEngine & {
  publish: (triggerName: string, payload: TPayload) => Promise<void>;
  asyncIterableIterator: (
    triggers: SubscriptionType | SubscriptionType[]
  ) => AsyncIterableIterator<SubscriptionType>;
};

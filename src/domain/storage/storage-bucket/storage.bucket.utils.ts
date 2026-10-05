import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { IStorageBucket } from './storage.bucket.interface';

// Load the inverse owner relation, or supply the already-known owner during a
// cascade. The bucket's parent storageAggregator is a different relationship.
export const isConversationBucket = (
  storageBucket: IStorageBucket | undefined
): boolean =>
  storageBucket?.directStorageOwner?.type ===
  StorageAggregatorType.CONVERSATION;

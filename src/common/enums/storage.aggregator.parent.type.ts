import { registerEnumType } from '@nestjs/graphql';

export enum StorageAggregatorParentType {
  SPACE = 'space',
  CHALLENGE = 'challenge',
  OPPORTUNITY = 'opportunity',
}

registerEnumType(StorageAggregatorParentType, {
  name: 'StorageAggregatorParentType',
});

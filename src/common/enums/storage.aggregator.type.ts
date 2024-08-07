import { registerEnumType } from '@nestjs/graphql';

export enum StorageAggregatorType {
  SPACE = 'space',
  ACCOUNT = 'account',
  USER = 'user',
  ORGANIZATION = 'organization',
  PLATFORM = 'platform',
}

registerEnumType(StorageAggregatorType, {
  name: 'StorageAggregatorType',
});

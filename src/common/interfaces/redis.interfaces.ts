import { Cache, Store } from 'cache-manager';
import { RedisClientType } from 'redis';

export interface RedisCache extends Cache {
  store: RedisStore;
}

export interface RedisStore extends Store {
  name: 'redis';
  getClient: () => RedisClientType;
  isCacheableValue: (value: any) => boolean;
}

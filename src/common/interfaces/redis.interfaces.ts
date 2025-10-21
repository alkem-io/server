import { Cache, Store } from 'cache-manager';

interface RedisClientLike {
  quit(callback?: (err?: Error | null, res?: string) => void): void;
}

export interface RedisCache extends Cache {
  store: RedisStore;
}

export interface RedisStore extends Store {
  name: 'redis';
  getClient: () => RedisClientLike;
  isCacheableValue: (value: any) => boolean;
}

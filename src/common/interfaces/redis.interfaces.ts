import { Cache, Store } from 'cache-manager';

/**
 * The slice of the node_redis v3 client we actually use. Callback-style
 * because `cache-manager-redis-store@2` wraps `redis@3`, which predates the
 * promise API.
 */
export interface RedisClientLike {
  quit(callback?: (err?: Error | null, res?: string) => void): void;
  /**
   * Atomic increment. This is the whole point: the auth-reset queue runs as
   * competing consumers across pods (see main.worker.ts), so a
   * read-modify-write on a shared key loses increments and the owning task
   * never reaches its target — the hang of alkem-io/server#6310.
   */
  incr(key: string, callback?: (err: Error | null, res: number) => void): void;
  /** Raw GET — returns the counter as a string, or null when unset. */
  get(
    key: string,
    callback?: (err: Error | null, res: string | null) => void
  ): void;
  expire(
    key: string,
    seconds: number,
    callback?: (err: Error | null, res: number) => void
  ): void;
}

export interface RedisCache extends Cache {
  store: RedisStore;
}

export interface RedisStore extends Store {
  name: 'redis';
  getClient: () => RedisClientLike;
  isCacheableValue: (value: any) => boolean;
}

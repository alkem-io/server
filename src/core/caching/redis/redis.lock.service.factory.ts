import { RedisCache } from '@interfaces/redis.interfaces';
import { RedisClient } from 'redis';
import Redlock from 'redlock';

export function redisLockServiceFactory(cache: RedisCache): Redlock {
  const redisClient: RedisClient = cache.store.getClient();
  return new Redlock(
    // You should have one client for each independent redis node
    // or cluster.
    [redisClient],
    {
      // The expected clock drift; for more details see:
      // http://redis.io/topics/distlock
      driftFactor: 0.01, // multiplied by lock ttl to determine drift time

      // The max number of times Redlock will attempt to lock a resource
      // before erroring.
      retryCount: 20,

      // the time in ms between attempts
      retryDelay: 100, // time in ms

      // the max time in ms randomly added to retries
      // to improve performance under high contention
      // see https://www.awsarchitectureblog.com/2015/03/backoff.html
      retryJitter: 200, // time in ms

      // The minimum remaining time on a lock before an extension is automatically
      // attempted with the `using` API.
      automaticExtensionThreshold: 100, // time in ms
    }
  );
}

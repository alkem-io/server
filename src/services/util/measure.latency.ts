import { OperatorFunction } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * RxJS operator that measures elapsed time from operator creation to each emission.
 *
 * Designed for **single-emission request-response patterns** (e.g., NATS requests)
 * where you want to measure round-trip latency from the moment the request is sent
 * until the response arrives.
 *
 * @remarks
 * The timer starts when the operator is created (i.e., when piped), not per emission.
 * For multi-emission observables, latency values will be cumulative from operator
 * creation time—use a different approach if per-emission timing is required.
 *
 * @example
 * ```typescript
 * natsClient.send({ pattern: 'query', data }).pipe(
 *   timeout(5000),
 *   measureLatency(),
 *   tap(({ latency }) => console.log(`Round trip: ${latency}ms`)),
 *   map(({ value }) => value)
 * );
 * ```
 */
export const measureLatency = <T>(): OperatorFunction<
  T,
  { value: T; latency: number }
> => {
  const sentAt = performance.now();
  return map(value => {
    const receivedAt = performance.now();
    const latency = receivedAt - sentAt;
    return { value, latency };
  });
};

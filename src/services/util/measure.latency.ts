import { OperatorFunction } from 'rxjs';
import { map } from 'rxjs/operators';

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

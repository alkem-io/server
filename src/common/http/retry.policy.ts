import { AxiosError, isAxiosError } from 'axios';
import { TimeoutError } from 'rxjs';
import type { HttpMethod } from './http.client.base';

/**
 * Classification of outbound-HTTP errors for retry decisions.
 *
 * Goal: be able to answer, for each kind of failure, two questions —
 *  1. Is it safe to retry? (did the request reach the server; does the
 *     method allow duplicates?)
 *  2. Is this a signal the downstream is unhealthy, so the circuit
 *     breaker should count it?
 *
 * The retry table and the circuit-breaker table happen to align in our
 * model (errors we don't retry are also errors we don't count).
 */
export type ErrorClass =
  | 'http-4xx' // client error — never retry
  | 'http-503' // server explicitly says retry
  | 'http-504' // gateway couldn't reach origin — request likely didn't arrive
  | 'http-5xx-other' // ambiguous (500/501/502/505…); may have been processed
  | 'pre-send-transport' // ECONNREFUSED, ENOTFOUND, EAI_AGAIN, EHOSTUNREACH, ENETUNREACH — request never reached server
  | 'post-send-transport' // ECONNRESET / ECONNABORTED / ETIMEDOUT — ambiguous
  | 'rxjs-timeout' // our own client-side timeout — request may have been received
  | 'other'; // anything we can't recognise as HTTP/transport — treat as a local
// error (e.g. transform/parse failure) that must never be retried and must
// not count toward the circuit breaker (it says nothing about downstream
// health)

const PRE_SEND_TRANSPORT_CODES = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EHOSTUNREACH',
  'ENETUNREACH',
]);

const IDEMPOTENT_METHODS = new Set<HttpMethod>([
  'get',
  'put',
  'delete',
  'patch', // in this codebase PATCH is used as merge-patch of scalars → idempotent
]);

export function classifyError(error: unknown): ErrorClass {
  if (error instanceof TimeoutError) return 'rxjs-timeout';
  if (!isAxiosError(error)) return 'other';

  const axiosErr = error as AxiosError;
  if (axiosErr.response) {
    const status = axiosErr.response.status;
    if (status >= 400 && status < 500) return 'http-4xx';
    if (status === 503) return 'http-503';
    if (status === 504) return 'http-504';
    if (status >= 500) return 'http-5xx-other';
    return 'other'; // 1xx/2xx/3xx reached catchError — shouldn't happen
  }

  // No response. Distinguish three sub-cases:
  //  1. No `request` either → Axios failed before issuing the request
  //     (bad URL, invalid config, ERR_BAD_OPTION). Retrying with the
  //     same config won't help — treat as a local bug.
  //  2. Known pre-connection transport codes → request never reached
  //     the server; retry is safe even for POST.
  //  3. Anything else → request was in flight; we can't tell whether
  //     the server processed it.
  if (!axiosErr.request) return 'other';
  if (axiosErr.code && PRE_SEND_TRANSPORT_CODES.has(axiosErr.code)) {
    return 'pre-send-transport';
  }
  return 'post-send-transport';
}

/**
 * Decide whether `cls` is retriable for a request using HTTP `method`.
 *
 * Principle: retry if the request is known not to have reached the server
 * (pre-send transport, 504), or if the server explicitly invites retry
 * (503). Otherwise retry only when the method is idempotent — running
 * the same request again can't produce duplicates or unwanted side effects.
 */
export function isRetriable(cls: ErrorClass, method: HttpMethod): boolean {
  switch (cls) {
    case 'http-4xx':
    case 'other':
      // 4xx: client's fault, retry can't help. 'other': not a recognised
      // HTTP or transport error — most likely a local bug (transform /
      // parse failure). Same treatment: don't retry, and (since the
      // circuit breaker uses the same predicate) don't count either.
      return false;
    case 'http-503':
    case 'http-504':
    case 'pre-send-transport':
      return true;
    case 'http-5xx-other':
    case 'post-send-transport':
    case 'rxjs-timeout':
      return IDEMPOTENT_METHODS.has(method);
  }
}

/**
 * Metadata included in circuit-open denial responses.
 */
export interface CircuitOpenDenialMetadata {
  /** Current circuit breaker state */
  circuitState: 'open' | 'half-open' | 'closed';
  /** Number of consecutive failures that triggered circuit open */
  failureCount: number;
  /** Type of error that caused the denial (optional) */
  errorType?: 'no-subscribers' | 'service-error' | 'timeout';
}

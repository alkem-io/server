/**
 * Metadata included in circuit-open denial responses.
 */
export interface CircuitOpenDenialMetadata {
  /** Current circuit breaker state */
  circuitState: 'open';
  /** Number of consecutive failures that triggered circuit open */
  failureCount: number;
}

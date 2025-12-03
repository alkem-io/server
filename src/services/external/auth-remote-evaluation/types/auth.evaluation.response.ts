export interface AuthEvaluationResponse {
  allowed: boolean;
  reason: string;
  error?: ErrorDetails;
}

export interface ErrorDetails {
  code: ErrorCode; // Machine-readable error code (e.g., "circuit_breaker_open")
  dependency?: 'nats' | 'database'; // Affected dependency (e.g., "database", "nats")
  retryAfterMs?: number; // Suggested retry delay in milliseconds
}

export type ErrorCode =
  | 'circuit_breaker_open'
  | 'dependency_unavailable'
  | 'nats_unavailable';

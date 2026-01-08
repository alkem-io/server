export interface PolicyInvalidationMessage {
  /** Multiple policy IDs to invalidate in one message. */
  policyIds: string[];
}

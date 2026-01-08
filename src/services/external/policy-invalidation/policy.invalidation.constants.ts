// Chosen to keep NATS payloads comfortably small while amortizing publish overhead.
// UUIDs are 36 chars; even 200 IDs is typically well under common NATS limits.
export const POLICY_INVALIDATION_IDS_PER_MESSAGE = 200;

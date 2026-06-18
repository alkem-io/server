/**
 * Structured error codes returned in the `error` field of the unified
 * collaboration replies (FR-004 — never leak exceptions over the bus).
 *
 * The frozen wire contract carries the error as a free-text `error` string; we
 * keep a small typed code-set internally so the handlers map exceptions
 * consistently (mirrors the legacy `FetchErrorCodes` / `SaveErrorCodes`).
 */
export enum CollaborationErrorCode {
  NOT_FOUND = 'not_found',
  INTERNAL_ERROR = 'internal_error',
  UNKNOWN_BLOB_STORE = 'unknown_blob_store',
}

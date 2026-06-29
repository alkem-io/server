/**
 * Constants for conversation media attachments (feature
 * 013-matrix-media-file-service).
 */

/**
 * Reserved platform-level staging bucket for inbound Matrix media. Fixed/seeded
 * UUID — the Synapse storage provider creates every inbound Matrix media here
 * first (no room context at upload time); the server re-homes rows out of it on
 * `message.received`. Also exposed via config (`storage.file_service
 * .matrix_media_bucket_id`) so the provider and server agree on the id.
 */
export const MATRIX_MEDIA_STORAGE_BUCKET_ID =
  '00000000-0000-4000-8000-000000000013';

/** 50 MiB cap on conversation media (FR-020), reconciled with Synapse + file-service. */
export const CONVERSATION_MEDIA_MAX_FILE_SIZE = 52428800;

/** Maximum attachments carried by a single message (FR-023). */
export const MAX_MESSAGE_ATTACHMENTS = 10;

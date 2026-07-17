/**
 * Constants for conversation media attachments (feature
 * 013-matrix-media-file-service).
 */

/** 50 MiB cap on conversation media (FR-020), reconciled with Synapse + file-service. */
export const CONVERSATION_MEDIA_MAX_FILE_SIZE = 52428800;

/** Maximum attachments carried by a single message (FR-023). */
export const MAX_MESSAGE_ATTACHMENTS = 10;

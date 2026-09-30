import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Removes the curated MIME allow-list and the 50 MiB cap from the reserved
 * `matrix_media` STAGING bucket seeded by
 * 1782300000001-MatrixMediaStorageBucket (feature 013).
 *
 * WHY (scope principle): client + server + matrix-adapter are a TIERED CLIENT
 * of Synapse, not a gatekeeper for it. The staging bucket is not an Alkemio
 * surface — it is where the Synapse media-storage provider lands EVERY local
 * media upload on the homeserver, including uploads in rooms Alkemio does not
 * own. Alkemio's conversation policy must constrain what Alkemio SURFACES, not
 * what Synapse ACCEPTS, so the staging bucket must carry no Alkemio policy at
 * all.
 *
 * The seed's stated rationale ("anything the conversation buckets accept must
 * also pass staging, or it is rejected before it can be re-homed") assumed the
 * bucket row gates the provider's uploads. It does not: file-service takes
 * `allowedMimeTypes` / `maxFileSize` from the multipart CREATE request (they
 * are `createFields` in internal/adapter/inbound/http/document_handler.go and
 * are only enforced by `CompleteUpload` when non-empty / > 0), and the provider
 * sends neither field — only `storageBucketId`, `externalReference`,
 * `displayName`, `skipImageProcessing`. file-service has no `storage_bucket`
 * table of its own and never reads this row. So today these two columns are
 * INERT for the provider path and merely record a policy that is not, and must
 * not be, applied there.
 *
 * They are cleared rather than left inert because they are a live trap: the
 * columns ARE authoritative for any upload mediated by
 * `StorageBucketService` (which forwards them to file-service verbatim), so the
 * first server-side write into staging — or any future file-service change that
 * reads bucket policy from the shared DB — would start failing Synapse uploads
 * platform-wide, with `store_local: true` + `store_synchronous: true` turning
 * each rejection into a hard Matrix upload error.
 *
 * "Unrestricted" follows the platform convention already applied by
 * `MessageAttachmentService.checkAgainstBucketPolicy`: an EMPTY
 * `allowedMimeTypes` means "no MIME allow-list" and `maxFileSize = 0` means "no
 * size limit". Synapse's own `max_upload_size` and file-service's global
 * `MaxUploadSize` remain the real caps, exactly as before feature 013.
 *
 * Alkemio-side enforcement of FR-020 / FR-022 is UNCHANGED and stays where it
 * belongs: on the CONVERSATION (or comment-room collaboration) bucket, applied
 * at inbound re-home and on the outbound send path.
 *
 * Corrects the already-shipped 1782300000001 forward rather than editing it in
 * place, since that migration has run.
 */
export class MatrixMediaStagingBucketUnrestricted1785800000000
  implements MigrationInterface
{
  name = 'MatrixMediaStagingBucketUnrestricted1785800000000';

  private readonly bucketId = '00000000-0000-4000-8000-000000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE storage_bucket SET "allowedMimeTypes" = '', "maxFileSize" = 0 WHERE id = $1`,
      [this.bucketId]
    );
  }

  /**
   * Restores the original seeded policy verbatim (the snapshot inlined in
   * 1782300000001), so a revert leaves the row exactly as that migration left
   * it.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    const allowedMimeTypes = [
      'image/bmp',
      'image/jpg',
      'image/jpeg',
      'image/x-png',
      'image/png',
      'image/gif',
      'image/webp',
      'image/avif',
      'image/heic',
      'image/heif',
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
      'audio/mpeg',
      'audio/ogg',
      'audio/wav',
      'audio/webm',
      'audio/aac',
      'audio/flac',
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.oasis.opendocument.spreadsheet',
      'text/csv',
      'text/calendar',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.oasis.opendocument.text',
      'application/rtf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.presentation',
      'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
      'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
      'application/vnd.ms-powerpoint.slideshow.macroEnabled.12',
      'application/vnd.openxmlformats-officedocument.presentationml.template',
      'application/vnd.ms-powerpoint.template.macroEnabled.12',
      'application/vnd.oasis.opendocument.graphics',
    ].join(',');

    await queryRunner.query(
      `UPDATE storage_bucket SET "allowedMimeTypes" = $2, "maxFileSize" = 52428800 WHERE id = $1`,
      [this.bucketId, allowedMimeTypes]
    );
  }
}

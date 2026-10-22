import { ExistingMediaRef } from '@alkemio/matrix-adapter-lib';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Injectable } from '@nestjs/common';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { RoomMessageAttachmentInput } from '../room/dto/room.dto.attachment';
import { IRoom } from '../room/room.interface';
import { isCommentRoom, isConversationRoom } from '../room/room.utils';
import {
  MessageAttachmentService,
  sanitizeAttachmentDisplayName,
} from './message.attachment.service';

// The image types every browser renders inline. Uploads of the first three
// are stripped of location and device metadata; GIF carries none. HEIC, HEIF
// and AVIF keep their metadata and do not render everywhere, so they are out.
// File-service stores MIME types already lower-cased without parameters.
const COMMENT_IMAGE_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const isCommentImageMimeType = (mimeType: string): boolean =>
  COMMENT_IMAGE_MIME_TYPES.has(mimeType);

/** Room operation authorization is shared with ordinary sends at the resolver. */
@Injectable()
export class RoomAttachmentSendService {
  constructor(
    private readonly attachments: MessageAttachmentService,
    private readonly files: FileServiceAdapter,
    private readonly authorization: AuthorizationService
  ) {}

  async existingMedia(
    room: IRoom,
    actor: ActorContext,
    input: RoomMessageAttachmentInput
  ): Promise<ExistingMediaRef> {
    const bucket = await this.targetBucket(room, actor);
    const metadata = await this.files.getReferenceMetadata(
      input.externalReference
    );
    if (
      !metadata ||
      !/^[A-Za-z0-9_-]+$/.test(input.externalReference) ||
      !this.attachments.matchesBucketPolicy(bucket, metadata)
    )
      this.invalid();
    // Comment rooms accept JPEG, PNG, GIF and WebP images only, whatever else
    // the space bucket allows; conversations keep every type their bucket
    // allows.
    if (isCommentRoom(room) && !isCommentImageMimeType(metadata.mimeType))
      this.invalid();
    return {
      media_id: input.externalReference,
      display_name: sanitizeAttachmentDisplayName(
        input.displayName,
        'attachment'
      ),
      mime_type: metadata.mimeType,
      size: metadata.size,
      width: metadata.width,
      height: metadata.height,
    };
  }

  private async targetBucket(room: IRoom, actor: ActorContext) {
    // Only conversation and comment rooms take attachments.
    if (!isConversationRoom(room) && !isCommentRoom(room)) this.invalid();
    const bucket = await this.attachments.getTargetBucketForRoom(room);
    if (!bucket) this.invalid();
    if (isConversationRoom(room)) {
      this.authorization.grantAccessOrFail(
        actor,
        bucket.authorization,
        AuthorizationPrivilege.FILE_UPLOAD,
        `send room attachment: ${room.id}`
      );
    }
    // Comment rooms: the caller's message gate already authorizes posting in
    // the room; the bucket only sets the accepted file types and size.
    return bucket;
  }

  private invalid(): never {
    throw new ValidationException(
      'Attachment is not available for this room',
      LogContext.COMMUNICATION
    );
  }
}

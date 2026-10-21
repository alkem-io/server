import { ExistingMediaRef } from '@alkemio/matrix-adapter-lib';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Injectable } from '@nestjs/common';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { RoomMessageAttachmentInput } from '../room/dto/room.dto.attachment';
import { IRoom } from '../room/room.interface';
import { isConversationRoom } from '../room/room.utils';
import {
  MessageAttachmentService,
  sanitizeAttachmentDisplayName,
} from './message.attachment.service';

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
    input: RoomMessageAttachmentInput,
    threadID?: string
  ): Promise<ExistingMediaRef> {
    const bucket = await this.targetBucket(room, actor, threadID);
    const metadata = await this.files.getReferenceMetadata(
      input.externalReference
    );
    if (
      !metadata ||
      !/^[A-Za-z0-9_-]+$/.test(input.externalReference) ||
      !this.attachments.matchesBucketPolicy(bucket, metadata)
    )
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

  private async targetBucket(
    room: IRoom,
    actor: ActorContext,
    threadID?: string
  ) {
    const bucket = await this.attachments.getTargetBucketForRoom(room);
    if (!bucket) this.invalid();
    if (isConversationRoom(room)) {
      // A conversation owns its bucket; its participants hold the upload
      // right on it.
      this.authorization.grantAccessOrFail(
        actor,
        bucket.authorization,
        AuthorizationPrivilege.FILE_UPLOAD,
        `send room attachment: ${room.id}`
      );
    } else {
      // A comment room stores attachments in the space's shared bucket, on
      // which ordinary members hold no upload right, so attaching follows the
      // right to post in this room instead. Attachments arriving from Matrix
      // are placed in the same bucket on that same right. The bucket still
      // sets the accepted file types and size.
      this.authorization.grantAccessOrFail(
        actor,
        room.authorization,
        threadID
          ? AuthorizationPrivilege.CREATE_MESSAGE_REPLY
          : AuthorizationPrivilege.CREATE_MESSAGE,
        `send room attachment: ${room.id}`
      );
    }
    return bucket;
  }

  private invalid(): never {
    throw new ValidationException(
      'Attachment is not available for this room',
      LogContext.COMMUNICATION
    );
  }
}

import { ExistingMediaRef } from '@alkemio/matrix-adapter-lib';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Injectable } from '@nestjs/common';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { RoomMessageAttachmentInput } from '../room/dto/room.dto.attachment';
import { IRoom } from '../room/room.interface';
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
    const bucket = await this.attachments.getTargetBucketForRoom(room);
    if (!bucket) this.invalid();
    this.authorization.grantAccessOrFail(
      actor,
      bucket.authorization,
      AuthorizationPrivilege.FILE_UPLOAD,
      `send room attachment: ${room.id}`
    );
    return bucket;
  }

  private invalid(): never {
    throw new ValidationException(
      'Attachment is not available for this room',
      LogContext.COMMUNICATION
    );
  }
}

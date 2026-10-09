import { ExistingMediaRef } from '@alkemio/matrix-adapter-lib';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MatrixMediaUploadClient } from '@services/adapters/communication-adapter/matrix.media.upload.client';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { FileUpload } from 'graphql-upload';
import {
  RoomMessageAttachmentInput,
  RoomMessageAttachmentUploadResult,
} from '../room/dto/room.dto.upload.attachment';
import { IRoom } from '../room/room.interface';
import {
  MessageAttachmentService,
  sanitizeAttachmentDisplayName,
} from './message.attachment.service';

/** Room operation authorization is shared with ordinary sends at the resolver. */
@Injectable()
export class RoomAttachmentUploadService {
  constructor(
    private readonly attachments: MessageAttachmentService,
    private readonly files: FileServiceAdapter,
    private readonly matrix: MatrixMediaUploadClient,
    private readonly authorization: AuthorizationService,
    private readonly config: ConfigService<AlkemioConfig, true>
  ) {}

  async upload(
    room: IRoom,
    actor: ActorContext,
    file: FileUpload,
    signal?: AbortSignal
  ): Promise<RoomMessageAttachmentUploadResult> {
    if (signal?.aborted) this.invalid();
    const bucket = await this.uploadBucket(room, actor);
    if (
      bucket.allowedMimeTypes?.length &&
      !bucket.allowedMimeTypes.includes(file.mimetype as never)
    )
      this.invalid();
    const displayName = sanitizeAttachmentDisplayName(
      file.filename,
      '_unspecified_'
    );
    const globalCap = this.config.get('storage.file.max_file_size', {
      infer: true,
    });
    const limit =
      bucket.maxFileSize > 0
        ? Math.min(bucket.maxFileSize, globalCap)
        : globalCap;
    const counter = file.createReadStream();
    const abort = () => counter.destroy(new Error('Upload cancelled'));
    signal?.addEventListener('abort', abort, { once: true });
    let size = 0;
    try {
      for await (const chunk of counter) {
        if (signal?.aborted) this.invalid();
        size +=
          typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length;
        if (limit > 0 && size > limit) this.invalid();
      }
    } finally {
      signal?.removeEventListener('abort', abort);
      counter.destroy();
    }
    if (signal?.aborted) this.invalid();
    const source = file.createReadStream();
    try {
      const uploaded = await this.matrix.upload(
        source,
        { actorID: actor.actorID, displayName, mimeType: file.mimetype, size },
        signal
      );
      if (signal?.aborted) this.invalid();
      return { externalReference: uploaded.mediaId, displayName };
    } finally {
      source.destroy();
    }
  }

  async existingMedia(
    room: IRoom,
    actor: ActorContext,
    input: RoomMessageAttachmentInput
  ): Promise<ExistingMediaRef> {
    const bucket = await this.uploadBucket(room, actor);
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

  private async uploadBucket(room: IRoom, actor: ActorContext) {
    const bucket = await this.attachments.getTargetBucketForRoom(room);
    if (!bucket) this.invalid();
    this.authorization.grantAccessOrFail(
      actor,
      bucket.authorization,
      AuthorizationPrivilege.FILE_UPLOAD,
      `upload room attachment: ${room.id}`
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

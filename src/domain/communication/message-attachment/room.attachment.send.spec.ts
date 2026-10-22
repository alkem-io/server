import { RoomType } from '@common/enums/room.type';
import { ValidationException } from '@common/exceptions';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomAttachmentSendService } from './room.attachment.send';

const actor = { actorID: '11111111-1111-4111-8111-111111111111' } as any;
const room = {
  id: '22222222-2222-4222-8222-222222222222',
  type: RoomType.CONVERSATION_DIRECT,
} as any;
const reference = { externalReference: 'media-ref', displayName: 'résumé.png' };
const bucket = { id: 'bucket', authorization: { id: 'policy' } };

describe('sending a completed media reference', () => {
  const attachments = {
    getTargetBucketForRoom: vi.fn(),
    matchesBucketPolicy: vi.fn(),
  };
  const files = { getReferenceMetadata: vi.fn() };
  const auth = { grantAccessOrFail: vi.fn() };
  let service: RoomAttachmentSendService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new RoomAttachmentSendService(
      attachments as any,
      files as any,
      auth as any
    );
    attachments.getTargetBucketForRoom.mockResolvedValue(bucket);
    attachments.matchesBucketPolicy.mockReturnValue(true);
    files.getReferenceMetadata.mockResolvedValue({
      mimeType: 'image/png',
      size: 5,
      width: 2,
      height: 3,
    });
  });

  it('uses stored metadata for the reference at send time', async () => {
    expect(await service.existingMedia(room, actor, reference as any)).toEqual({
      media_id: reference.externalReference,
      display_name: reference.displayName,
      mime_type: 'image/png',
      size: 5,
      width: 2,
      height: 3,
    });
    expect(files.getReferenceMetadata).toHaveBeenCalledWith(
      reference.externalReference
    );
  });

  it('rejects destination permission before resolving the staged reference', async () => {
    auth.grantAccessOrFail.mockImplementation(() => {
      throw new Error('denied');
    });
    await expect(
      service.existingMedia(room, actor, reference as any)
    ).rejects.toThrow('denied');
    expect(files.getReferenceMetadata).not.toHaveBeenCalled();
  });

  it('rejects an already-uploaded file that fails the destination policy', async () => {
    attachments.matchesBucketPolicy.mockReturnValue(false);
    await expect(
      service.existingMedia(room, actor, reference as any)
    ).rejects.toThrow();
  });

  it('does not substitute a missing media reference', async () => {
    files.getReferenceMetadata.mockResolvedValue(null);
    await expect(
      service.existingMedia(room, actor, reference as any)
    ).rejects.toThrow();
  });

  const roomOf = (type: RoomType) => ({ ...room, type }) as any;
  const commentRooms = [RoomType.CALLOUT, RoomType.POST];
  const each = (mimeTypes: string[]) =>
    commentRooms.flatMap(type =>
      mimeTypes.map(mimeType => [type, mimeType] as const)
    );

  it.each(
    each(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
  )('accepts an image in a %s comment room (%s) without the bucket upload right', async (type, mimeType) => {
    auth.grantAccessOrFail.mockImplementation(() => {
      throw new Error('denied');
    });
    files.getReferenceMetadata.mockResolvedValue({ mimeType, size: 5 });
    await expect(
      service.existingMedia(roomOf(type), actor, reference as any)
    ).resolves.toMatchObject({ mime_type: mimeType });
    expect(auth.grantAccessOrFail).not.toHaveBeenCalled();
  });

  it.each(
    each([
      'image/heic',
      'image/heif',
      'image/avif',
      'image/svg+xml',
      'application/pdf',
    ])
  )('refuses a non-JPEG/PNG/GIF/WebP attachment in a %s comment room (%s) even when the bucket allows it', async (type, mimeType) => {
    files.getReferenceMetadata.mockResolvedValue({ mimeType, size: 5 });
    await expect(
      service.existingMedia(roomOf(type), actor, reference as any)
    ).rejects.toThrow(ValidationException);
    expect(attachments.matchesBucketPolicy).toHaveBeenCalledWith(
      bucket,
      expect.objectContaining({ mimeType })
    );
  });

  it('accepts any bucket-allowed type in a conversation room', async () => {
    files.getReferenceMetadata.mockResolvedValue({
      mimeType: 'application/pdf',
      size: 5,
    });
    await expect(
      service.existingMedia(room, actor, reference as any)
    ).resolves.toMatchObject({ mime_type: 'application/pdf' });
  });

  it.each([
    RoomType.UPDATES,
    RoomType.CALENDAR_EVENT,
    RoomType.DISCUSSION_FORUM,
  ])('requires the bucket upload right in a %s room when a bucket is returned', async type => {
    auth.grantAccessOrFail.mockImplementation(() => {
      throw new Error('denied');
    });
    await expect(
      service.existingMedia(roomOf(type), actor, reference as any)
    ).rejects.toThrow('denied');
    expect(files.getReferenceMetadata).not.toHaveBeenCalled();
  });

  it('rejects a room without a target bucket as invalid', async () => {
    attachments.getTargetBucketForRoom.mockResolvedValue(undefined);
    await expect(
      service.existingMedia(roomOf(RoomType.CALLOUT), actor, reference as any)
    ).rejects.toThrow(ValidationException);
    expect(files.getReferenceMetadata).not.toHaveBeenCalled();
  });
});

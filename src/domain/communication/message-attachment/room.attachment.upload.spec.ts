import { Readable } from 'stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomAttachmentUploadService } from './room.attachment.upload';

const actor = { actorID: '11111111-1111-4111-8111-111111111111' } as any;
const room = { id: '22222222-2222-4222-8222-222222222222' } as any;
const bytes = Buffer.from([0, 1, 2, 3, 255]);
const bucket = {
  id: 'bucket',
  authorization: { id: 'policy' },
  allowedMimeTypes: ['image/png'],
  maxFileSize: 10,
};
const reference = { externalReference: 'media-ref', displayName: 'résumé.png' };

describe('raw reference upload', () => {
  const attachments = {
    getTargetBucketForRoom: vi.fn(),
    matchesBucketPolicy: vi.fn(),
  };
  const files = { getReferenceMetadata: vi.fn() };
  const matrix = { upload: vi.fn() };
  const auth = { grantAccessOrFail: vi.fn() };
  let service: RoomAttachmentUploadService;
  let readers: number;
  const upload = () => ({
    filename: reference.displayName,
    mimetype: 'image/png',
    createReadStream: () => {
      readers++;
      return Readable.from([bytes]);
    },
  });
  beforeEach(() => {
    vi.resetAllMocks();
    readers = 0;
    service = new RoomAttachmentUploadService(
      attachments as any,
      files as any,
      matrix as any,
      auth as any,
      { get: () => 20 } as any
    );
    attachments.getTargetBucketForRoom.mockResolvedValue(bucket);
    attachments.matchesBucketPolicy.mockReturnValue(true);
    files.getReferenceMetadata.mockResolvedValue({
      mimeType: 'image/png',
      size: bytes.length,
      width: 2,
      height: 3,
    });
    matrix.upload.mockImplementation(async source => {
      const chunks = [];
      for await (const chunk of source) chunks.push(chunk);
      expect(Buffer.concat(chunks)).toEqual(bytes);
      return { mediaId: reference.externalReference };
    });
  });
  it('forwards exact original bytes from the existing spool and returns only a media reference', async () => {
    expect(await service.upload(room, actor, upload() as any)).toEqual(
      reference
    );
    expect(readers).toBe(2);
    expect(matrix.upload).toHaveBeenCalledWith(
      expect.any(Readable),
      expect.objectContaining({ size: bytes.length, mimeType: 'image/png' }),
      undefined
    );
    expect(files.getReferenceMetadata).not.toHaveBeenCalled();
  });
  it('denies before consuming bytes when current upload privilege is absent', async () => {
    auth.grantAccessOrFail.mockImplementation(() => {
      throw new Error('denied');
    });
    await expect(service.upload(room, actor, upload() as any)).rejects.toThrow(
      'denied'
    );
    expect(readers).toBe(0);
    expect(matrix.upload).not.toHaveBeenCalled();
  });
  it('enforces existing raw size cap before forwarding', async () => {
    attachments.getTargetBucketForRoom.mockResolvedValue({
      ...bucket,
      maxFileSize: 2,
    });
    await expect(
      service.upload(room, actor, upload() as any)
    ).rejects.toThrow();
    expect(readers).toBe(1);
    expect(matrix.upload).not.toHaveBeenCalled();
  });
  it('accepts an unrestricted MIME policy', async () => {
    attachments.getTargetBucketForRoom.mockResolvedValue({
      ...bucket,
      allowedMimeTypes: [],
    });
    await expect(service.upload(room, actor, upload() as any)).resolves.toEqual(
      reference
    );
  });
  it('derives send metadata by external reference, without another upload', async () => {
    expect(await service.existingMedia(room, actor, reference as any)).toEqual({
      media_id: reference.externalReference,
      display_name: reference.displayName,
      mime_type: 'image/png',
      size: bytes.length,
      width: 2,
      height: 3,
    });
    expect(files.getReferenceMetadata).toHaveBeenCalledWith(
      reference.externalReference
    );
    expect(matrix.upload).not.toHaveBeenCalled();
  });
  it('denies changed target policy before sending known media', async () => {
    attachments.matchesBucketPolicy.mockReturnValue(false);
    await expect(
      service.existingMedia(room, actor, reference as any)
    ).rejects.toThrow();
    expect(matrix.upload).not.toHaveBeenCalled();
  });
  it('does not substitute a missing external reference', async () => {
    files.getReferenceMetadata.mockResolvedValue(null);
    await expect(
      service.existingMedia(room, actor, reference as any)
    ).rejects.toThrow();
  });
  it('stops cancellation before opening the upload spool', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      service.upload(room, actor, upload() as any, controller.signal)
    ).rejects.toThrow();
    expect(readers).toBe(0);
    expect(matrix.upload).not.toHaveBeenCalled();
  });
});

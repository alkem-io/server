import { ValidationException } from '@common/exceptions';
import { RoomSendMessageInput } from '@domain/communication/room/dto/room.dto.send.message';
import { RoomSendMessageReplyInput } from '@domain/communication/room/dto/room.dto.send.message.reply';
import { RoomMessageAttachmentUploadInput } from '@domain/communication/room/dto/room.dto.upload.attachment';
import { plainToInstance } from 'class-transformer';
import { BaseHandler } from './base.handler';

const roomID = '11111111-1111-4111-8111-111111111111';
const media = { externalReference: 'native_media', displayName: 'image.png' };

describe('BaseHandler', () => {
  const handler = new BaseHandler();
  describe.each([
    RoomSendMessageInput,
    RoomSendMessageReplyInput,
  ])('%s reference validation', inputType => {
    const input = (attachmentUpload: unknown = media) =>
      plainToInstance(inputType, {
        roomID,
        message: '',
        threadID: '$parent',
        attachmentUpload,
      });
    it('accepts a plain media reference for send and reply', async () => {
      await expect(handler.handle(input(), inputType)).resolves.toBeNull();
    });
    it.each([
      '',
      'mxc://matrix.example/media',
      'a'.repeat(257),
    ])('rejects an invalid media reference %s', async externalReference => {
      await expect(
        handler.handle(input({ ...media, externalReference }), inputType)
      ).rejects.toThrow(ValidationException);
    });
    it('validates nested filename length', async () => {
      await expect(
        handler.handle(
          input({ ...media, displayName: 'a'.repeat(513) }),
          inputType
        )
      ).rejects.toThrow(ValidationException);
    });
    it('keeps ordinary text messages valid without an attachment', async () => {
      await expect(
        handler.handle(
          plainToInstance(inputType, {
            roomID,
            threadID: '$parent',
            message: 'hello',
          }),
          inputType
        )
      ).resolves.toBeNull();
    });
  });
  it('registers upload input thread validation', async () => {
    await expect(
      handler.handle(
        plainToInstance(RoomMessageAttachmentUploadInput, {
          roomID,
          threadID: 'x'.repeat(513),
        }),
        RoomMessageAttachmentUploadInput
      )
    ).rejects.toThrow(ValidationException);
  });
  it('does not validate a type that is not registered', async () => {
    class UnregisteredInput {}
    await expect(
      handler.handle(new UnregisteredInput(), UnregisteredInput)
    ).resolves.toBeNull();
  });
});

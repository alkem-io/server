import { ValidationException } from '@common/exceptions';
import { RoomSendMessageInput } from '@domain/communication/room/dto/room.dto.send.message';
import { RoomSendMessageReplyInput } from '@domain/communication/room/dto/room.dto.send.message.reply';
import { BaseHandler } from './base.handler';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';

const reply = (attachments?: string[]): RoomSendMessageReplyInput =>
  Object.assign(new RoomSendMessageReplyInput(), {
    roomID: UUID_A,
    message: 'hello',
    threadID: 'thread-1',
    attachments,
  });

/**
 * `BaseHandler.handle` matches with `types.includes(metatype)` — REFERENCE
 * equality on the constructor — so a SUBCLASS of a listed input is NOT covered
 * by its parent's entry. `RoomSendMessageReplyInput extends
 * RoomSendMessageInput`, so before it was listed in its own right the reply
 * mutation ran NO class-validator rules at all: `attachments` had no size cap,
 * no uniqueness check and no UUID check.
 */
describe('BaseHandler', () => {
  let handler: BaseHandler;

  beforeEach(() => {
    handler = new BaseHandler();
  });

  describe('RoomSendMessageReplyInput (feature 013 attachments)', () => {
    it('accepts a well-formed reply with one attachment', async () => {
      await expect(
        handler.handle(reply([UUID_A]), RoomSendMessageReplyInput)
      ).resolves.toBeNull();
    });

    it('rejects more than the maximum number of attachments on a REPLY', async () => {
      await expect(
        handler.handle(reply([UUID_A, UUID_B]), RoomSendMessageReplyInput)
      ).rejects.toThrow(ValidationException);
    });

    it('rejects a non-UUID attachment id on a REPLY', async () => {
      await expect(
        handler.handle(reply(['not-a-uuid']), RoomSendMessageReplyInput)
      ).rejects.toThrow(ValidationException);
    });

    it('rejects a repeated attachment id on a REPLY', async () => {
      await expect(
        handler.handle(reply([UUID_A, UUID_A]), RoomSendMessageReplyInput)
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('RoomSendMessageInput', () => {
    it('still rejects more than the maximum number of attachments', async () => {
      const input = Object.assign(new RoomSendMessageInput(), {
        roomID: UUID_A,
        message: 'hello',
        attachments: [UUID_A, UUID_B],
      });

      await expect(handler.handle(input, RoomSendMessageInput)).rejects.toThrow(
        ValidationException
      );
    });
  });

  it('does not validate a type that is not registered', async () => {
    class UnregisteredInput {}

    await expect(
      handler.handle(new UnregisteredInput(), UnregisteredInput)
    ).resolves.toBeNull();
  });
});

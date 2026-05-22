import { MessagingService } from '@domain/communication/messaging/messaging.service';
import { MessagingRejectionReason } from '@domain/communication/messaging/types/messaging.rejection.reasons';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { MatrixRoomCheckController } from './matrix.room.check.controller';

describe('MatrixRoomCheckController', () => {
  let controller: MatrixRoomCheckController;
  let messagingService: Mocked<MessagingService>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [MatrixRoomCheckController, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    controller = module.get(MatrixRoomCheckController);
    messagingService = module.get(MessagingService);
  });

  // T026 — covers data-model.md test matrix rows 17–18
  describe('checkRoom wire translation', () => {
    const creator = '11111111-1111-4111-8111-111111111111';
    const member = '22222222-2222-4222-8222-222222222222';

    it('accepted → { allow: true, alkemio_room_id }', async () => {
      const assignedId = '99999999-9999-4999-8999-999999999999';
      messagingService.createConversationFromExternal.mockResolvedValue({
        kind: 'accepted',
        alkemioRoomId: assignedId,
      });

      const result = await controller.checkRoom({
        creator_actor_id: creator,
        member_actor_ids: [member],
        is_direct: true,
      });

      expect(result).toEqual({ allow: true, alkemio_room_id: assignedId });
    });

    it('rejected → { allow: false, reason }', async () => {
      messagingService.createConversationFromExternal.mockResolvedValue({
        kind: 'rejected',
        reason: MessagingRejectionReason.MESSAGING_DISABLED,
      });

      const result = await controller.checkRoom({
        creator_actor_id: creator,
        member_actor_ids: [member],
        is_direct: true,
      });

      expect(result).toEqual({
        allow: false,
        reason: MessagingRejectionReason.MESSAGING_DISABLED,
      });
    });

    it('uncaught exception in domain → INTERNAL_ERROR envelope', async () => {
      messagingService.createConversationFromExternal.mockRejectedValue(
        new Error('boom')
      );

      const result = await controller.checkRoom({
        creator_actor_id: creator,
        member_actor_ids: [member],
        is_direct: true,
      });

      expect(result).toEqual({
        allow: false,
        reason: MessagingRejectionReason.INTERNAL_ERROR,
      });
    });
  });

  describe('getRoomInfo wire translation', () => {
    const roomId = '88888888-8888-4888-8888-888888888888';

    it('hit → maps domain shape to snake_case wire response', async () => {
      messagingService.getRoomInfo.mockResolvedValue({
        type: 'conversation_direct',
        isDirect: true,
        members: [
          { actorId: 'a', displayName: 'Alice' },
          { actorId: 'b', displayName: 'Bob' },
        ],
      });

      const result = await controller.getRoomInfo({ alkemio_room_id: roomId });

      expect(result).toEqual({
        alkemio_room_id: roomId,
        type: 'conversation_direct',
        is_direct: true,
        members: [
          { actor_id: 'a', display_name: 'Alice' },
          { actor_id: 'b', display_name: 'Bob' },
        ],
      });
    });

    it('miss → empty members envelope', async () => {
      messagingService.getRoomInfo.mockResolvedValue({
        type: '',
        isDirect: false,
        members: [],
      });

      const result = await controller.getRoomInfo({ alkemio_room_id: roomId });

      expect(result).toEqual({
        alkemio_room_id: roomId,
        type: '',
        is_direct: false,
        members: [],
      });
    });

    it('uncaught exception → empty-members miss envelope', async () => {
      messagingService.getRoomInfo.mockRejectedValue(new Error('boom'));

      const result = await controller.getRoomInfo({ alkemio_room_id: roomId });

      expect(result).toEqual({
        alkemio_room_id: roomId,
        type: '',
        is_direct: false,
        members: [],
      });
    });
  });
});

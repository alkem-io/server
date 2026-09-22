import { LogContext } from '@common/enums';
import { RoomType } from '@common/enums/room.type';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { MessageAttachmentService } from '@domain/communication/message-attachment/message.attachment.service';
import { RoomLookupService } from '@domain/communication/room-lookup/room.lookup.service';
import { Nack } from '@golevelup/nestjs-rabbitmq';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { CommunicationAdapterEventService } from '@services/adapters/communication-adapter/communication.adapter.event.service';
import { MessageInboxService } from '@services/event-handlers/internal/message-inbox/message.inbox.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('conversation media receipt boundary', () => {
  const payload = {
    roomId: 'room',
    roomName: 'Attachment test',
    actorID: 'alice',
    message: {
      id: 'event',
      message: 'image.png',
      timestamp: 1,
      sender: 'alice',
      reactions: [],
      attachments: [
        {
          media_id: 'media',
          display_name: 'image.png',
          mime_type: 'image/png',
          size: 10,
        },
      ],
    },
  };

  async function setup(prepare: ReturnType<typeof vi.fn>) {
    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        CommunicationAdapterEventService,
        MessageInboxService,
        MockWinstonProvider,
        {
          provide: MessageAttachmentService,
          useValue: { prepareInboundAttachments: prepare },
        },
        {
          provide: RoomLookupService,
          useValue: {
            getRoomOrFail: vi
              .fn()
              .mockResolvedValue({ id: 'room', type: RoomType.UPDATES }),
            incrementMessagesCount: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();
    await module.init();
    return module;
  }

  it('holds receipt and notification publication until placement finishes', async () => {
    let finish!: (bucket: string) => void;
    const prepare = vi.fn().mockReturnValue(
      new Promise<string>(resolve => {
        finish = resolve;
      })
    );
    const module = await setup(prepare);
    try {
      const emitter = module.get(EventEmitter2);
      const received = vi.fn();
      emitter.on('message.received', received);
      let acknowledged = false;
      const operation = module
        .get(CommunicationAdapterEventService)
        .onMessageReceived(payload)
        .then(result => {
          acknowledged = true;
          return result;
        });
      await vi.waitFor(() => expect(prepare).toHaveBeenCalledTimes(1));
      expect(acknowledged).toBe(false);
      expect(received).not.toHaveBeenCalled();
      expect(
        module.get(RoomLookupService).incrementMessagesCount
      ).not.toHaveBeenCalled();
      finish('conversation-bucket');
      expect(await operation).toBeUndefined();
      expect(received).toHaveBeenCalledWith(
        expect.objectContaining({ storageBucketId: 'conversation-bucket' })
      );
    } finally {
      await module.close();
    }
  });

  it('propagates a real decorated listener rejection to Nack without notifications', async () => {
    const module = await setup(
      vi.fn().mockRejectedValue(new Error('file-service unavailable'))
    );
    try {
      const received = vi.fn();
      module.get(EventEmitter2).on('message.received', received);
      const result = await module
        .get(CommunicationAdapterEventService)
        .onMessageReceived(payload);
      expect(result).toBeInstanceOf(Nack);
      expect(received).not.toHaveBeenCalled();
      expect(
        module.get(RoomLookupService).incrementMessagesCount
      ).not.toHaveBeenCalled();
    } finally {
      await module.close();
    }
  });
  it('does not requeue media for a deleted room', async () => {
    const prepare = vi.fn();
    const module = await setup(prepare);
    try {
      vi.mocked(module.get(RoomLookupService).getRoomOrFail).mockRejectedValue(
        new EntityNotFoundException('Room deleted', LogContext.COMMUNICATION)
      );
      const received = vi.fn();
      module.get(EventEmitter2).on('message.received', received);
      const result = await module
        .get(CommunicationAdapterEventService)
        .onMessageReceived(payload);
      expect(result).toEqual(new Nack(false));
      expect(prepare).not.toHaveBeenCalled();
      expect(received).not.toHaveBeenCalled();
    } finally {
      await module.close();
    }
  });
});

import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { RoomType } from '@common/enums/room.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { IMessage } from '@domain/communication/message/message.interface';
import { MentionedEntityType } from '@domain/communication/messaging/mention.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { RoomServiceEvents } from '@domain/communication/room/room.service.events';
import { RoomMentionsService } from '@domain/communication/room-mentions/room.mentions.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { MessageNotificationService } from './message.notification.service';

describe('MessageNotificationService', () => {
  let service: MessageNotificationService;
  let roomMentionsService: Mocked<RoomMentionsService>;
  let roomServiceEvents: Mocked<RoomServiceEvents>;
  let roomResolverService: Mocked<RoomResolverService>;
  let communicationAdapter: Mocked<CommunicationAdapter>;

  const mockRoom = (type: RoomType): IRoom =>
    ({ id: 'room-1', type }) as unknown as IRoom;

  const mockMessage = (): IMessage => ({
    id: 'msg-1',
    message: 'Hello @user',
    sender: 'actor-1',
    timestamp: 1000,
    reactions: [],
  });

  const mockActorContext = (): ActorContext =>
    ({ actorID: 'actor-1' }) as ActorContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessageNotificationService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(MessageNotificationService);
    roomMentionsService = module.get(RoomMentionsService);
    roomServiceEvents = module.get(RoomServiceEvents);
    roomResolverService = module.get(RoomResolverService);
    communicationAdapter = module.get(CommunicationAdapter);
  });

  describe('processMessageNotifications', () => {
    it('should process mention notifications when mentions are found in the message', async () => {
      const room = mockRoom(RoomType.UPDATES);
      const message = mockMessage();
      const actorContext = mockActorContext();
      const mentions = [
        {
          actorID: 'user-1',
          actorType: MentionedEntityType.USER,
        },
      ];

      roomMentionsService.getMentionsFromText.mockResolvedValue(mentions);
      roomMentionsService.processNotificationMentions.mockResolvedValue(
        undefined as any
      );
      roomServiceEvents.processNotificationUpdateSent.mockResolvedValue(
        undefined as any
      );
      roomServiceEvents.processActivityUpdateSent.mockResolvedValue(
        undefined as any
      );

      await service.processMessageNotifications(room, message, actorContext);

      expect(
        roomMentionsService.processNotificationMentions
      ).toHaveBeenCalledWith(mentions, room, message, actorContext);
    });

    it('should skip mention notifications when no mentions are found', async () => {
      const room = mockRoom(RoomType.UPDATES);
      const message = mockMessage();
      const actorContext = mockActorContext();

      roomMentionsService.getMentionsFromText.mockResolvedValue([]);
      roomServiceEvents.processNotificationUpdateSent.mockResolvedValue(
        undefined as any
      );
      roomServiceEvents.processActivityUpdateSent.mockResolvedValue(
        undefined as any
      );

      await service.processMessageNotifications(room, message, actorContext);

      expect(
        roomMentionsService.processNotificationMentions
      ).not.toHaveBeenCalled();
    });

    it('should process reply notification when threadID differs from message ID', async () => {
      const room = mockRoom(RoomType.UPDATES);
      const message = mockMessage();
      const actorContext = mockActorContext();

      roomMentionsService.getMentionsFromText.mockResolvedValue([]);
      communicationAdapter.getMessageSenderActor.mockResolvedValue(
        'parent-sender-actor'
      );
      roomServiceEvents.processNotificationCommentReply.mockResolvedValue(
        undefined as any
      );
      roomServiceEvents.processNotificationUpdateSent.mockResolvedValue(
        undefined as any
      );
      roomServiceEvents.processActivityUpdateSent.mockResolvedValue(
        undefined as any
      );

      await service.processMessageNotifications(
        room,
        message,
        actorContext,
        'parent-thread-1'
      );

      expect(
        roomServiceEvents.processNotificationCommentReply
      ).toHaveBeenCalledWith(
        room,
        message,
        actorContext,
        'parent-sender-actor'
      );
    });

    it('should not process reply notification when threadID equals message ID', async () => {
      const room = mockRoom(RoomType.UPDATES);
      const message = mockMessage();
      const actorContext = mockActorContext();

      roomMentionsService.getMentionsFromText.mockResolvedValue([]);
      roomServiceEvents.processNotificationUpdateSent.mockResolvedValue(
        undefined as any
      );
      roomServiceEvents.processActivityUpdateSent.mockResolvedValue(
        undefined as any
      );

      await service.processMessageNotifications(
        room,
        message,
        actorContext,
        'msg-1' // same as message.id
      );

      expect(
        roomServiceEvents.processNotificationCommentReply
      ).not.toHaveBeenCalled();
    });

    it('should process POST room type with post contribution notifications', async () => {
      const room = mockRoom(RoomType.POST);
      const message = mockMessage();
      const actorContext = mockActorContext();

      roomMentionsService.getMentionsFromText.mockResolvedValue([]);
      roomResolverService.getCalloutWithPostContributionForRoom.mockResolvedValue(
        {
          post: { id: 'post-1' },
          callout: { id: 'callout-1' },
          contribution: { id: 'contrib-1' },
        } as any
      );
      roomServiceEvents.processNotificationPostContributionComment.mockResolvedValue(
        undefined as any
      );
      roomServiceEvents.processActivityPostComment.mockResolvedValue(
        undefined as any
      );

      await service.processMessageNotifications(room, message, actorContext);

      expect(
        roomServiceEvents.processNotificationPostContributionComment
      ).toHaveBeenCalled();
      expect(roomServiceEvents.processActivityPostComment).toHaveBeenCalled();
    });

    it('should process CALLOUT room type only when visibility is PUBLISHED and type is COLLABORATION', async () => {
      const room = mockRoom(RoomType.CALLOUT);
      const message = mockMessage();
      const actorContext = mockActorContext();

      roomMentionsService.getMentionsFromText.mockResolvedValue([]);
      roomResolverService.getCalloutForRoom.mockResolvedValue({
        id: 'callout-1',
        settings: { visibility: CalloutVisibility.PUBLISHED },
        calloutsSet: { type: CalloutsSetType.COLLABORATION },
      } as any);
      roomServiceEvents.processActivityCalloutCommentCreated.mockResolvedValue(
        undefined as any
      );
      roomServiceEvents.processNotificationCalloutComment.mockResolvedValue(
        undefined as any
      );

      await service.processMessageNotifications(room, message, actorContext);

      expect(
        roomServiceEvents.processActivityCalloutCommentCreated
      ).toHaveBeenCalled();
      expect(
        roomServiceEvents.processNotificationCalloutComment
      ).toHaveBeenCalled();
    });

    it('should skip CALLOUT notifications when visibility is DRAFT', async () => {
      const room = mockRoom(RoomType.CALLOUT);
      const message = mockMessage();
      const actorContext = mockActorContext();

      roomMentionsService.getMentionsFromText.mockResolvedValue([]);
      roomResolverService.getCalloutForRoom.mockResolvedValue({
        id: 'callout-1',
        settings: { visibility: CalloutVisibility.DRAFT },
        calloutsSet: { type: CalloutsSetType.COLLABORATION },
      } as any);

      await service.processMessageNotifications(room, message, actorContext);

      expect(
        roomServiceEvents.processActivityCalloutCommentCreated
      ).not.toHaveBeenCalled();
      expect(
        roomServiceEvents.processNotificationCalloutComment
      ).not.toHaveBeenCalled();
    });

    it('should skip CALLOUT notifications when calloutsSet type is KNOWLEDGE_BASE', async () => {
      const room = mockRoom(RoomType.CALLOUT);
      const message = mockMessage();
      const actorContext = mockActorContext();

      roomMentionsService.getMentionsFromText.mockResolvedValue([]);
      roomResolverService.getCalloutForRoom.mockResolvedValue({
        id: 'callout-1',
        settings: { visibility: CalloutVisibility.PUBLISHED },
        calloutsSet: { type: CalloutsSetType.KNOWLEDGE_BASE },
      } as any);

      await service.processMessageNotifications(room, message, actorContext);

      expect(
        roomServiceEvents.processActivityCalloutCommentCreated
      ).not.toHaveBeenCalled();
    });

    it('should process CALENDAR_EVENT room type with calendar event notifications', async () => {
      const room = mockRoom(RoomType.CALENDAR_EVENT);
      const message = mockMessage();
      const actorContext = mockActorContext();

      roomMentionsService.getMentionsFromText.mockResolvedValue([]);
      roomResolverService.getCalendarEventForRoom.mockResolvedValue({
        id: 'cal-event-1',
      } as any);
      roomServiceEvents.processNotificationCalendarEventComment.mockResolvedValue(
        undefined as any
      );

      await service.processMessageNotifications(room, message, actorContext);

      expect(
        roomServiceEvents.processNotificationCalendarEventComment
      ).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'cal-event-1' }),
        room,
        message,
        actorContext
      );
    });

    it('should process DISCUSSION_FORUM room type with discussion notifications', async () => {
      const room = mockRoom(RoomType.DISCUSSION_FORUM);
      const message = mockMessage();
      const actorContext = mockActorContext();

      roomMentionsService.getMentionsFromText.mockResolvedValue([]);
      roomResolverService.getDiscussionForRoom.mockResolvedValue({
        id: 'discussion-1',
      } as any);
      roomServiceEvents.processNotificationForumDiscussionComment.mockResolvedValue(
        undefined as any
      );

      await service.processMessageNotifications(room, message, actorContext);

      expect(
        roomServiceEvents.processNotificationForumDiscussionComment
      ).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'discussion-1' }),
        message,
        actorContext
      );
    });

    it('should not process reply notification when parent message sender is not found', async () => {
      const room = mockRoom(RoomType.UPDATES);
      const message = mockMessage();
      const actorContext = mockActorContext();

      roomMentionsService.getMentionsFromText.mockResolvedValue([]);
      communicationAdapter.getMessageSenderActor.mockResolvedValue(
        undefined as any
      );
      roomServiceEvents.processNotificationUpdateSent.mockResolvedValue(
        undefined as any
      );
      roomServiceEvents.processActivityUpdateSent.mockResolvedValue(
        undefined as any
      );

      await service.processMessageNotifications(
        room,
        message,
        actorContext,
        'parent-thread-1'
      );

      expect(
        roomServiceEvents.processNotificationCommentReply
      ).not.toHaveBeenCalled();
    });
  });

  describe('getMentionsFromText', () => {
    it('should delegate to roomMentionsService.getMentionsFromText', async () => {
      const mentions = [
        { actorID: 'user-1', actorType: MentionedEntityType.USER },
      ];
      roomMentionsService.getMentionsFromText.mockResolvedValue(mentions);

      const result = await service.getMentionsFromText('Hello @user');

      expect(roomMentionsService.getMentionsFromText).toHaveBeenCalledWith(
        'Hello @user'
      );
      expect(result).toEqual(mentions);
    });
  });

  describe('processVirtualContributorMentions', () => {
    it('should delegate to roomMentionsService.processVirtualContributorMentions', async () => {
      const mentions = [
        {
          actorID: 'vc-1',
          actorType: MentionedEntityType.VIRTUAL_CONTRIBUTOR,
        },
      ];
      const actorContext = mockActorContext();
      const room = mockRoom(RoomType.CALLOUT);
      roomMentionsService.processVirtualContributorMentions.mockResolvedValue(
        undefined as any
      );

      await service.processVirtualContributorMentions(
        mentions,
        'Hello @vc',
        'thread-1',
        actorContext,
        room
      );

      expect(
        roomMentionsService.processVirtualContributorMentions
      ).toHaveBeenCalledWith(
        mentions,
        'Hello @vc',
        'thread-1',
        actorContext,
        room
      );
    });
  });
});

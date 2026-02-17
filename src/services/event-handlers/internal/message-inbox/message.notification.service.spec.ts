import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { RoomType } from '@common/enums/room.type';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IMessage } from '@domain/communication/message/message.interface';
import { MentionedEntityType } from '@domain/communication/messaging/mention.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { RoomServiceEvents } from '@domain/communication/room/room.service.events';
import { RoomMentionsService } from '@domain/communication/room-mentions/room.mentions.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';
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
  let contributorLookupService: Mocked<ContributorLookupService>;
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

  const mockAgentInfo = (): AgentInfo => ({ agentID: 'actor-1' }) as AgentInfo;

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
    contributorLookupService = module.get(ContributorLookupService);
    communicationAdapter = module.get(CommunicationAdapter);
  });

  describe('processMessageNotifications', () => {
    it('should process mention notifications when mentions are found in the message', async () => {
      const room = mockRoom(RoomType.UPDATES);
      const message = mockMessage();
      const agentInfo = mockAgentInfo();
      const mentions = [
        {
          contributorID: 'user-1',
          contributorType: MentionedEntityType.USER,
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

      await service.processMessageNotifications(room, message, agentInfo);

      expect(
        roomMentionsService.processNotificationMentions
      ).toHaveBeenCalledWith(mentions, room, message, agentInfo);
    });

    it('should skip mention notifications when no mentions are found', async () => {
      const room = mockRoom(RoomType.UPDATES);
      const message = mockMessage();
      const agentInfo = mockAgentInfo();

      roomMentionsService.getMentionsFromText.mockResolvedValue([]);
      roomServiceEvents.processNotificationUpdateSent.mockResolvedValue(
        undefined as any
      );
      roomServiceEvents.processActivityUpdateSent.mockResolvedValue(
        undefined as any
      );

      await service.processMessageNotifications(room, message, agentInfo);

      expect(
        roomMentionsService.processNotificationMentions
      ).not.toHaveBeenCalled();
    });

    it('should process reply notification when threadID differs from message ID', async () => {
      const room = mockRoom(RoomType.UPDATES);
      const message = mockMessage();
      const agentInfo = mockAgentInfo();

      roomMentionsService.getMentionsFromText.mockResolvedValue([]);
      communicationAdapter.getMessageSenderActor.mockResolvedValue(
        'parent-sender-actor'
      );
      contributorLookupService.getUserIdByAgentId.mockResolvedValue(
        'parent-user-1'
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
        agentInfo,
        'parent-thread-1'
      );

      expect(
        roomServiceEvents.processNotificationCommentReply
      ).toHaveBeenCalledWith(room, message, agentInfo, 'parent-user-1');
    });

    it('should not process reply notification when threadID equals message ID', async () => {
      const room = mockRoom(RoomType.UPDATES);
      const message = mockMessage();
      const agentInfo = mockAgentInfo();

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
        agentInfo,
        'msg-1' // same as message.id
      );

      expect(
        roomServiceEvents.processNotificationCommentReply
      ).not.toHaveBeenCalled();
    });

    it('should process POST room type with post contribution notifications', async () => {
      const room = mockRoom(RoomType.POST);
      const message = mockMessage();
      const agentInfo = mockAgentInfo();

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

      await service.processMessageNotifications(room, message, agentInfo);

      expect(
        roomServiceEvents.processNotificationPostContributionComment
      ).toHaveBeenCalled();
      expect(roomServiceEvents.processActivityPostComment).toHaveBeenCalled();
    });

    it('should process CALLOUT room type only when visibility is PUBLISHED and type is COLLABORATION', async () => {
      const room = mockRoom(RoomType.CALLOUT);
      const message = mockMessage();
      const agentInfo = mockAgentInfo();

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

      await service.processMessageNotifications(room, message, agentInfo);

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
      const agentInfo = mockAgentInfo();

      roomMentionsService.getMentionsFromText.mockResolvedValue([]);
      roomResolverService.getCalloutForRoom.mockResolvedValue({
        id: 'callout-1',
        settings: { visibility: CalloutVisibility.DRAFT },
        calloutsSet: { type: CalloutsSetType.COLLABORATION },
      } as any);

      await service.processMessageNotifications(room, message, agentInfo);

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
      const agentInfo = mockAgentInfo();

      roomMentionsService.getMentionsFromText.mockResolvedValue([]);
      roomResolverService.getCalloutForRoom.mockResolvedValue({
        id: 'callout-1',
        settings: { visibility: CalloutVisibility.PUBLISHED },
        calloutsSet: { type: CalloutsSetType.KNOWLEDGE_BASE },
      } as any);

      await service.processMessageNotifications(room, message, agentInfo);

      expect(
        roomServiceEvents.processActivityCalloutCommentCreated
      ).not.toHaveBeenCalled();
    });
  });
});

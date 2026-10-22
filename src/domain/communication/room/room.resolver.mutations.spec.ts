import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RoomType } from '@common/enums/room.type';
import { CalloutClosedException } from '@common/exceptions/callout/callout.closed.exception';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { MessagingNotEnabledException } from '@common/exceptions/messaging.not.enabled.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { RoomLookupService } from '../room-lookup/room.lookup.service';
import { RoomAttachmentAuthorization } from './room.attachment.authorization';
import { IRoom } from './room.interface';
import { RoomResolverMutations } from './room.resolver.mutations';
import { RoomService } from './room.service';
import { RoomAuthorizationService } from './room.service.authorization';

describe('RoomResolverMutations', () => {
  let resolver: RoomResolverMutations;
  let authorizationService: Mocked<AuthorizationService>;
  let roomService: Mocked<RoomService>;
  let roomResolverService: Mocked<RoomResolverService>;
  let roomAuthorizationService: Mocked<RoomAuthorizationService>;
  let roomLookupService: Mocked<RoomLookupService>;
  let userLookupService: Mocked<UserLookupService>;
  let communicationAdapter: Mocked<CommunicationAdapter>;

  const actorContext = { actorID: 'user-1' } as ActorContext;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomResolverMutations,
        RoomAttachmentAuthorization,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(RoomResolverMutations);
    authorizationService = module.get(AuthorizationService);
    roomService = module.get(RoomService);
    roomResolverService = module.get(RoomResolverService);
    roomAuthorizationService = module.get(RoomAuthorizationService);
    roomLookupService = module.get(RoomLookupService);
    userLookupService = module.get(UserLookupService);
    communicationAdapter = module.get(CommunicationAdapter);
  });

  describe.each([
    'send',
    'reply',
  ] as const)('attachment %s uses the existing room-operation gates', operation => {
    const invoke = () =>
      operation === 'send'
        ? resolver.sendMessageToRoom(
            {
              roomID: 'room-1',
              message: '',
              attachmentUpload: {
                externalReference: 'media',
                displayName: 'file.png',
              },
            },
            actorContext
          )
        : resolver.sendMessageReplyToRoom(
            {
              roomID: 'room-1',
              threadID: '$parent',
              message: '',
              attachmentUpload: {
                externalReference: 'media',
                displayName: 'file.png',
              },
            },
            actorContext
          );
    const noPublication = () => {
      expect(
        (resolver as any).roomAttachments.existingMedia
      ).not.toHaveBeenCalled();
      expect(roomLookupService.sendMessage).not.toHaveBeenCalled();
      expect(roomLookupService.sendMessageReply).not.toHaveBeenCalled();
    };
    it('denies an actor without the message right before event publication', async () => {
      const policy = { id: 'policy' };
      const required =
        operation === 'send'
          ? AuthorizationPrivilege.CREATE_MESSAGE
          : AuthorizationPrivilege.CREATE_MESSAGE_REPLY;
      roomService.getRoomOrFail.mockResolvedValue({
        id: 'room-1',
        type: RoomType.CALLOUT,
        authorization: policy,
      } as any);
      authorizationService.grantAccessOrFail.mockImplementation(
        (_actor, authorization, privilege) => {
          if (authorization === policy && privilege === required)
            throw new ForbiddenAuthorizationPolicyException(
              'denied',
              privilege,
              'policy',
              actorContext.actorID
            );
          return true;
        }
      );
      await expect(invoke()).rejects.toThrow(
        ForbiddenAuthorizationPolicyException
      );
      noPublication();
    });
    it('denies closed callout before event publication', async () => {
      roomService.getRoomOrFail.mockResolvedValue({
        id: 'room-1',
        type: RoomType.CALLOUT,
        authorization: { id: 'policy' },
      } as any);
      roomResolverService.getCalloutForRoom.mockResolvedValue({
        settings: { framing: { commentsEnabled: false } },
      } as any);
      await expect(invoke()).rejects.toThrow(CalloutClosedException);
      noPublication();
    });
    it('denies direct-message consent before event publication', async () => {
      roomService.getRoomOrFail.mockResolvedValue({
        id: 'room-1',
        type: RoomType.CONVERSATION_DIRECT,
        authorization: { id: 'policy' },
      } as any);
      communicationAdapter.getRoomMembers.mockResolvedValue([
        actorContext.actorID,
        'receiver',
      ]);
      userLookupService.getUserById.mockResolvedValue({
        id: 'receiver',
      } as any);
      userLookupService.getUserByIdOrFail.mockResolvedValue({
        settings: { communication: { allowOtherUsersToSendMessages: false } },
      } as any);
      await expect(invoke()).rejects.toThrow(MessagingNotEnabledException);
      noPublication();
    });
  });
  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe.each([
    'send',
    'reply',
  ] as const)('%s with text and an attachment', operation => {
    const room = {
      id: 'room-1',
      type: RoomType.UPDATES,
      authorization: { id: 'auth-1' },
    } as unknown as IRoom;
    const media = {
      media_id: 'media',
      display_name: 'pic.png',
      mime_type: 'image/png',
      size: 7,
    };
    const attachmentUpload = {
      externalReference: 'media',
      displayName: 'pic.png',
    };

    beforeEach(() => {
      roomService.getRoomOrFail.mockResolvedValue(room as any);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined as any);
      (resolver as any).roomAttachments.existingMedia.mockResolvedValue(media);
      roomLookupService.sendMessage.mockResolvedValue({ id: 'msg-1' } as any);
      roomLookupService.sendMessageReply.mockResolvedValue({
        id: 'reply-1',
      } as any);
    });

    it('is sent once, carrying both the text and the media reference', async () => {
      if (operation === 'send') {
        const input = {
          roomID: 'room-1',
          message: 'look at this',
          attachmentUpload,
        };
        await resolver.sendMessageToRoom(input, actorContext);
        expect(roomLookupService.sendMessage).toHaveBeenCalledTimes(1);
        expect(roomLookupService.sendMessage).toHaveBeenCalledWith(
          room,
          actorContext.actorID,
          expect.objectContaining({ message: 'look at this' }),
          media
        );
        expect(roomLookupService.sendMessageReply).not.toHaveBeenCalled();
      } else {
        const input = {
          roomID: 'room-1',
          threadID: '$parent',
          message: 'look at this',
          attachmentUpload,
        };
        await resolver.sendMessageReplyToRoom(input, actorContext);
        expect(roomLookupService.sendMessageReply).toHaveBeenCalledTimes(1);
        expect(roomLookupService.sendMessageReply).toHaveBeenCalledWith(
          room,
          actorContext.actorID,
          expect.objectContaining({
            message: 'look at this',
            threadID: '$parent',
          }),
          media
        );
        expect(roomLookupService.sendMessage).not.toHaveBeenCalled();
      }
    });
  });

  describe('sendMessageToRoom', () => {
    const mockRoom = {
      id: 'room-1',
      type: RoomType.UPDATES,
      authorization: { id: 'auth-1' },
    } as unknown as IRoom;

    beforeEach(() => {
      roomService.getRoomOrFail.mockResolvedValue(mockRoom as any);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined as any);
    });

    it('should send message to room', async () => {
      const mockMessage = { id: 'msg-1' } as any;
      roomLookupService.sendMessage.mockResolvedValue(mockMessage);

      const result = await resolver.sendMessageToRoom(
        { roomID: 'room-1', message: 'Hello' } as any,
        actorContext
      );

      expect(result).toBe(mockMessage);
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        mockRoom.authorization,
        AuthorizationPrivilege.CREATE_MESSAGE,
        expect.any(String)
      );
    });

    it('passes validated reference metadata to the one-event send', async () => {
      const media = {
        media_id: 'media',
        display_name: 'pic.png',
        mime_type: 'image/png',
        size: 7,
      };
      const input = {
        roomID: 'room-1',
        message: '',
        attachmentUpload: {
          externalReference: 'media',
          displayName: 'pic.png',
        },
      };
      (resolver as any).roomAttachments.existingMedia.mockResolvedValue(media);
      roomLookupService.sendMessage.mockResolvedValue({ id: 'msg-1' } as any);
      await resolver.sendMessageToRoom(input, actorContext);
      expect(roomLookupService.sendMessage).toHaveBeenCalledWith(
        mockRoom,
        actorContext.actorID,
        input,
        media
      );
    });

    it('propagates an unconfirmed reference send', async () => {
      (resolver as any).roomAttachments.existingMedia.mockResolvedValue({
        media_id: 'media',
      });
      roomLookupService.sendMessage.mockRejectedValue(new Error('send failed'));
      await expect(
        resolver.sendMessageToRoom(
          {
            roomID: 'room-1',
            message: '',
            attachmentUpload: {
              externalReference: 'media',
              displayName: 'pic.png',
            },
          },
          actorContext
        )
      ).rejects.toThrow('send failed');
    });

    it('should throw CalloutClosedException when callout comments are disabled', async () => {
      const calloutRoom = {
        ...mockRoom,
        type: RoomType.CALLOUT,
      } as unknown as IRoom;
      roomService.getRoomOrFail.mockResolvedValue(calloutRoom as any);
      roomResolverService.getCalloutForRoom.mockResolvedValue({
        id: 'callout-1',
        settings: { framing: { commentsEnabled: false } },
      } as any);

      await expect(
        resolver.sendMessageToRoom(
          { roomID: 'room-1', message: 'Hello' } as any,
          actorContext
        )
      ).rejects.toThrow(CalloutClosedException);
    });

    it('should throw MessagingNotEnabledException when receiver has messaging disabled', async () => {
      const directRoom = {
        ...mockRoom,
        type: RoomType.CONVERSATION_DIRECT,
      } as unknown as IRoom;
      roomService.getRoomOrFail.mockResolvedValue(directRoom as any);
      communicationAdapter.getRoomMembers.mockResolvedValue([
        'user-1',
        'other-user',
      ]);
      userLookupService.getUserById.mockResolvedValue({
        id: 'other-user',
      } as any);
      userLookupService.getUserByIdOrFail.mockResolvedValue({
        id: 'other-user',
        settings: {
          communication: { allowOtherUsersToSendMessages: false },
        },
      } as any);

      await expect(
        resolver.sendMessageToRoom(
          { roomID: 'room-1', message: 'Hello' } as any,
          actorContext
        )
      ).rejects.toThrow(MessagingNotEnabledException);
    });

    it('should skip validation when only sender in direct conversation', async () => {
      const directRoom = {
        ...mockRoom,
        type: RoomType.CONVERSATION_DIRECT,
      } as unknown as IRoom;
      roomService.getRoomOrFail.mockResolvedValue(directRoom as any);
      communicationAdapter.getRoomMembers.mockResolvedValue(['user-1']);
      const mockMessage = { id: 'msg-1' } as any;
      roomLookupService.sendMessage.mockResolvedValue(mockMessage);

      const result = await resolver.sendMessageToRoom(
        { roomID: 'room-1', message: 'Hello' } as any,
        actorContext
      );

      expect(result).toBe(mockMessage);
    });

    it('should skip validation when other member is not a user', async () => {
      const directRoom = {
        ...mockRoom,
        type: RoomType.CONVERSATION_DIRECT,
      } as unknown as IRoom;
      roomService.getRoomOrFail.mockResolvedValue(directRoom as any);
      communicationAdapter.getRoomMembers.mockResolvedValue([
        'user-1',
        'vc-agent-1',
      ]);
      userLookupService.getUserById.mockResolvedValue(null as any);
      const mockMessage = { id: 'msg-1' } as any;
      roomLookupService.sendMessage.mockResolvedValue(mockMessage);

      const result = await resolver.sendMessageToRoom(
        { roomID: 'room-1', message: 'Hello' } as any,
        actorContext
      );

      expect(result).toBe(mockMessage);
    });
  });

  describe('sendMessageReplyToRoom', () => {
    it('should send reply to room', async () => {
      const mockRoom = {
        id: 'room-1',
        type: RoomType.UPDATES,
        authorization: { id: 'auth-1' },
      } as unknown as IRoom;
      const mockReply = { id: 'reply-1' } as any;

      roomService.getRoomOrFail.mockResolvedValue(mockRoom as any);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined as any);
      roomLookupService.sendMessageReply.mockResolvedValue(mockReply);

      const result = await resolver.sendMessageReplyToRoom(
        { roomID: 'room-1', message: 'Reply', threadID: 'msg-1' } as any,
        actorContext
      );

      expect(result).toBe(mockReply);
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        mockRoom.authorization,
        AuthorizationPrivilege.CREATE_MESSAGE_REPLY,
        expect.any(String)
      );
    });
  });

  describe('addReactionToMessageInRoom', () => {
    it('should add reaction to message', async () => {
      const mockRoom = {
        id: 'room-1',
        authorization: { id: 'auth-1' },
      } as unknown as IRoom;
      const mockReaction = { id: 'reaction-1' } as any;

      roomService.getRoomOrFail.mockResolvedValue(mockRoom as any);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined as any);
      roomService.addReactionToMessage.mockResolvedValue(mockReaction);

      const result = await resolver.addReactionToMessageInRoom(
        {
          roomID: 'room-1',
          messageID: 'msg-1',
          emoji: '👍',
        } as any,
        actorContext
      );

      expect(result).toBe(mockReaction);
    });
  });

  describe('removeMessageOnRoom', () => {
    it('should remove message from room', async () => {
      const mockRoom = {
        id: 'room-1',
        authorization: { id: 'auth-1' },
      } as unknown as IRoom;

      roomService.getRoomOrFail.mockResolvedValue(mockRoom as any);
      roomAuthorizationService.extendAuthorizationPolicyForMessageSender.mockResolvedValue(
        { id: 'extended-auth' } as any
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined as any);
      roomService.removeRoomMessage.mockResolvedValue('msg-1');

      const result = await resolver.removeMessageOnRoom(
        { roomID: 'room-1', messageID: 'msg-1' } as any,
        actorContext
      );

      expect(result).toBe('msg-1');
    });
  });

  describe('removeReactionToMessageInRoom', () => {
    it('should remove reaction from room', async () => {
      const mockRoom = {
        id: 'room-1',
        authorization: { id: 'auth-1' },
      } as unknown as IRoom;

      roomService.getRoomOrFail.mockResolvedValue(mockRoom as any);
      roomAuthorizationService.extendAuthorizationPolicyForReactionSender.mockResolvedValue(
        { id: 'extended-auth' } as any
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined as any);
      roomService.removeReactionToMessage.mockResolvedValue(true);

      const result = await resolver.removeReactionToMessageInRoom(
        { roomID: 'room-1', reactionID: 'reaction-1' } as any,
        actorContext
      );

      expect(result).toBe(true);
    });
  });

  describe('markMessageAsReadInRoom', () => {
    it('should mark message as read', async () => {
      const mockRoom = {
        id: 'room-1',
        authorization: { id: 'auth-1' },
      } as unknown as IRoom;

      roomService.getRoomOrFail.mockResolvedValue(mockRoom as any);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined as any);
      roomService.markMessageAsRead.mockResolvedValue(true);

      const result = await resolver.markMessageAsReadInRoom(
        { roomID: 'room-1', messageID: 'msg-1' } as any,
        actorContext
      );

      expect(result).toBe(true);
    });
  });
});

import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { MessageID } from '@domain/common/scalars';
import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import type { Request, Response } from 'express';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { IMessage } from '../message/message.interface';
import { IMessageReaction } from '../message.reaction/message.reaction.interface';
import { RoomAttachmentUploadService } from '../message-attachment/room.attachment.upload';
import { RoomLookupService } from '../room-lookup/room.lookup.service';
import { RoomAddReactionToMessageInput } from './dto/room.dto.add.reaction.to.message';
import { RoomMarkMessageReadInput } from './dto/room.dto.mark.message.read';
import { RoomRemoveMessageInput } from './dto/room.dto.remove.message';
import { RoomRemoveReactionToMessageInput } from './dto/room.dto.remove.message.reaction';
import { RoomSendMessageInput } from './dto/room.dto.send.message';
import { RoomSendMessageReplyInput } from './dto/room.dto.send.message.reply';
import {
  RoomMessageAttachmentUploadInput,
  RoomMessageAttachmentUploadResult,
} from './dto/room.dto.upload.attachment';
import { RoomAttachmentAuthorization } from './room.attachment.authorization';
import { RoomService } from './room.service';
import { RoomAuthorizationService } from './room.service.authorization';

@InstrumentResolver()
@Resolver()
export class RoomResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private roomService: RoomService,
    private roomAuthorizationService: RoomAuthorizationService,
    private roomLookupService: RoomLookupService,
    private readonly messageGate: RoomAttachmentAuthorization,
    private readonly roomUploads: RoomAttachmentUploadService
  ) {}

  @Mutation(() => IMessage, {
    description:
      'Sends an comment message. Returns the id of the new Update message.',
  })
  async sendMessageToRoom(
    @Args('messageData') messageData: RoomSendMessageInput,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IMessage> {
    const room = await this.roomService.getRoomOrFail(messageData.roomID, {
      relations: { authorization: true },
    });

    this.validateMessageContent(messageData);
    await this.messageGate.assertOperation(room, actorContext);

    const existingMedia =
      messageData.attachmentUpload != null
        ? await this.roomUploads.existingMedia(
            room,
            actorContext,
            messageData.attachmentUpload
          )
        : undefined;

    const message = await this.roomLookupService.sendMessage(
      room,
      actorContext.actorID,
      messageData,
      existingMedia
    );

    // All post-send processing (notifications, activities, subscriptions)
    // now handled by MessageInboxService via Matrix event
    return message;
  }

  @Mutation(() => RoomMessageAttachmentUploadResult, {
    description:
      'Uploads original room media into Synapse staging for a later authorized message.',
  })
  async uploadRoomMessageAttachment(
    @Args('uploadData') input: RoomMessageAttachmentUploadInput,
    @Args('file', { type: () => GraphQLUpload }) file: FileUpload,
    @CurrentActor() actor: ActorContext,
    @Context() context?: { req?: Request; res?: Response }
  ): Promise<RoomMessageAttachmentUploadResult> {
    const room = await this.roomService.getRoomOrFail(input.roomID, {
      relations: { authorization: true },
    });
    await this.messageGate.assertOperation(room, actor, input.threadID);
    const controller = new AbortController();
    const response = context?.res ?? context?.req?.res;
    const cancelled = () => controller.abort();
    const closed = () => {
      if (!response?.writableEnded) cancelled();
    };
    context?.req?.once('aborted', cancelled);
    response?.once('close', closed);
    if (context?.req?.aborted || response?.destroyed) cancelled();
    try {
      return await this.roomUploads.upload(
        room,
        actor,
        await file,
        controller.signal
      );
    } finally {
      context?.req?.off('aborted', cancelled);
      response?.off('close', closed);
    }
  }

  private validateMessageContent(input: RoomSendMessageInput): void {
    if (input.attachmentUpload != null && input.message.trim()) {
      throw new ValidationException(
        'Send one attachment per message',
        LogContext.COMMUNICATION
      );
    }
  }

  @Mutation(() => IMessage, {
    description: 'Sends a reply to a message from the specified Room.',
  })
  async sendMessageReplyToRoom(
    @Args('messageData') messageData: RoomSendMessageReplyInput,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IMessage> {
    const room = await this.roomService.getRoomOrFail(messageData.roomID, {
      relations: { authorization: true },
    });

    this.validateMessageContent(messageData);
    await this.messageGate.assertOperation(
      room,
      actorContext,
      messageData.threadID
    );

    const existingMedia =
      messageData.attachmentUpload != null
        ? await this.roomUploads.existingMedia(
            room,
            actorContext,
            messageData.attachmentUpload
          )
        : undefined;

    const reply = await this.roomLookupService.sendMessageReply(
      room,
      actorContext.actorID,
      messageData,
      existingMedia
    );

    // All post-send processing (notifications, activities, subscriptions)
    // now handled by MessageInboxService via Matrix event
    return reply;
  }

  @Mutation(() => IMessageReaction, {
    description: 'Add a reaction to a message from the specified Room.',
  })
  async addReactionToMessageInRoom(
    @Args('reactionData') reactionData: RoomAddReactionToMessageInput,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IMessageReaction> {
    const room = await this.roomService.getRoomOrFail(reactionData.roomID);

    this.authorizationService.grantAccessOrFail(
      actorContext,
      room.authorization,
      AuthorizationPrivilege.CREATE_MESSAGE_REACTION,
      `room add reaction to message in room: ${room.id}`
    );

    const reaction = await this.roomService.addReactionToMessage(
      room,
      actorContext.actorID,
      reactionData
    );

    // Subscription will be published by MessageInboxService when Matrix echoes the reaction
    return reaction;
  }

  private virtualContributorsEnabled(): boolean {
    return true;
  }

  @Mutation(() => MessageID, {
    description: 'Removes a message.',
  })
  async removeMessageOnRoom(
    @Args('messageData') messageData: RoomRemoveMessageInput,
    @CurrentActor() actorContext: ActorContext
  ): Promise<string> {
    const room = await this.roomService.getRoomOrFail(messageData.roomID);

    // The choice was made **not** to wrap every message in an AuthorizationPolicy.
    // So we also allow users who sent the message in question to remove the message by
    // extending the authorization policy in memory but do not persist it.
    const extendedAuthorization =
      await this.roomAuthorizationService.extendAuthorizationPolicyForMessageSender(
        room,
        messageData.messageID
      );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      extendedAuthorization,
      AuthorizationPrivilege.DELETE,
      `room remove message: ${room.id}`
    );

    // Pass actorContext.actorID for future use when Matrix admin reflection is implemented
    // See: docs/matrix-admin-reflection.md
    const messageID = await this.roomService.removeRoomMessage(
      room,
      messageData,
      actorContext.actorID
    );

    // All post-delete processing (notifications, activities, subscriptions)
    // now handled by MessageInboxService via Matrix event
    return messageID;
  }

  @Mutation(() => Boolean, {
    description: 'Remove a reaction on a message from the specified Room.',
  })
  async removeReactionToMessageInRoom(
    @Args('reactionData') reactionData: RoomRemoveReactionToMessageInput,
    @CurrentActor() actorContext: ActorContext
  ): Promise<boolean> {
    const room = await this.roomService.getRoomOrFail(reactionData.roomID);

    // The choice was made **not** to wrap every message in an AuthorizationPolicy.
    // So we also allow users who sent the react in question to remove the reaction by
    // extending the authorization policy in memory but do not persist it.

    // Todo: to be tested, may need additional work to get this going
    const extendedAuthorization =
      await this.roomAuthorizationService.extendAuthorizationPolicyForReactionSender(
        room,
        reactionData.reactionID
      );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      extendedAuthorization,
      AuthorizationPrivilege.DELETE,
      `room remove reaction: ${room.id}`
    );

    // Pass actorContext.actorID for future use when Matrix admin reflection is implemented
    // See: docs/matrix-admin-reflection.md
    const isDeleted = await this.roomService.removeReactionToMessage(
      room,
      reactionData,
      actorContext.actorID
    );

    // Subscription will be published by MessageInboxService when Matrix echoes the removal
    return isDeleted;
  }

  @Mutation(() => Boolean, {
    description: 'Marks a message as read for the current user.',
  })
  async markMessageAsReadInRoom(
    @Args('messageData') messageData: RoomMarkMessageReadInput,
    @CurrentActor() actorContext: ActorContext
  ): Promise<boolean> {
    const room = await this.roomService.getRoomOrFail(messageData.roomID, {
      relations: { authorization: true },
    });

    this.authorizationService.grantAccessOrFail(
      actorContext,
      room.authorization,
      AuthorizationPrivilege.READ,
      `room mark message as read: ${room.id}`
    );

    return this.roomService.markMessageAsRead(
      room,
      actorContext.actorID,
      messageData
    );
  }
}

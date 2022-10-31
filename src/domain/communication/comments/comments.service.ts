import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { RoomService } from '../room/room.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { Comments } from './comments.entity';
import { IComments } from './comments.interface';
import { CommunicationRoomResult } from '../room/dto/communication.dto.room.result';
import { RoomRemoveMessageInput } from '../room/dto/room.dto.remove.message';
import { RoomSendMessageInput } from '../room/dto/room.dto.send.message';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { IMessage } from '../message/message.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comments)
    private commentsRepository: Repository<Comments>,
    private roomService: RoomService,
    private communicationAdapter: CommunicationAdapter,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createComments(
    communicationGroupID: string,
    displayName: string
  ): Promise<IComments> {
    const comments = new Comments(communicationGroupID, displayName);
    comments.authorization = new AuthorizationPolicy();
    comments.communicationRoomID =
      await this.roomService.initializeCommunicationRoom(comments);
    return await this.commentsRepository.save(comments);
  }

  async getCommentsOrFail(commentsID: string): Promise<IComments> {
    const comments = await this.commentsRepository.findOne({
      id: commentsID,
    });
    if (!comments)
      throw new EntityNotFoundException(
        `Not able to locate Comments with the specified ID: ${commentsID}`,
        LogContext.COMMUNICATION
      );
    return comments;
  }

  async deleteComments(comments: IComments): Promise<IComments> {
    const result = await this.commentsRepository.remove(comments as Comments);
    await this.communicationAdapter.removeRoom(comments.communicationRoomID);
    await this.roomService.removeRoom(comments);
    result.id = comments.id;
    return result;
  }

  async save(comments: IComments): Promise<IComments> {
    return await this.commentsRepository.save(comments);
  }

  async getCommentsRoom(comments: IComments): Promise<CommunicationRoomResult> {
    return await this.roomService.getCommunicationRoom(comments);
  }

  async sendCommentsMessage(
    comments: IComments,
    communicationUserID: string,
    messageData: RoomSendMessageInput
  ): Promise<IMessage> {
    return await this.roomService.sendMessage(
      comments,
      communicationUserID,
      messageData
    );
  }

  async removeCommentsMessage(
    comments: IComments,
    communicationUserID: string,
    messageData: RoomRemoveMessageInput
  ): Promise<string> {
    await this.roomService.removeMessage(
      comments,
      communicationUserID,
      messageData
    );
    return messageData.messageID;
  }
}

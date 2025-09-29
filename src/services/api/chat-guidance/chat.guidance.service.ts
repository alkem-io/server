import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { ConfigService } from '@nestjs/config';
import { ChatGuidanceInput } from './dto/chat.guidance.dto.input';
import { AlkemioConfig } from '@src/types';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { InvocationResultAction } from '@services/ai-server/ai-persona/dto';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { IRoom } from '@domain/communication/room/room.interface';
import { RoomService } from '@domain/communication/room/room.service';
import { UserService } from '@domain/community/user/user.service';
import { IMessageGuidanceQuestionResult } from '@domain/communication/message.guidance.question.result/message.guidance.question.result.interface';
import { PlatformService } from '@platform/platform/platform.service';
import { InvocationOperation } from '@common/enums/ai.persona.invocation.operation';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatGuidanceService {
  constructor(
    private configService: ConfigService<AlkemioConfig, true>,
    private aiServerAdapter: AiServerAdapter,
    private communicationAdapter: CommunicationAdapter,
    private roomService: RoomService,
    private userService: UserService,
    private platformService: PlatformService
  ) {}

  public async createGuidanceRoom(agentInfo: AgentInfo): Promise<IRoom> {
    const guidanceVc =
      await this.platformService.getGuidanceVirtualContributorOrFail();
    const room = await this.userService.createGuidanceRoom(agentInfo.userID);

    await this.communicationAdapter.addUserToRoom(
      room.externalRoomID,
      agentInfo.communicationID
    );
    await this.communicationAdapter.addUserToRoom(
      room.externalRoomID,
      guidanceVc.communicationID
    );
    return room;
  }

  /**
   *
   * @param chatData
   * @param agentInfo
   * @returns {
   *  room: IRoom;
   *  roomCreated: boolean; Indicates that the room has just been created with this request
   * }
   */
  public async askQuestion(
    chatData: ChatGuidanceInput,
    agentInfo: AgentInfo
  ): Promise<IMessageGuidanceQuestionResult> {
    const room = await this.userService.getGuidanceRoom(agentInfo.userID);
    if (!room) {
      return {
        success: false,
        error: 'No guidance room found',
        question: chatData.question,
      };
    }
    const guidanceVc =
      await this.platformService.getGuidanceVirtualContributorOrFail();

    const message = await this.communicationAdapter.sendMessage({
      roomID: room.externalRoomID,
      senderCommunicationsID: agentInfo.communicationID,
      message: chatData.question,
    });

    this.aiServerAdapter.invoke({
      operation: InvocationOperation.QUERY,
      message: chatData.question,
      aiPersonaID: guidanceVc.aiPersonaID,
      userID: agentInfo.userID,
      displayName: 'Guidance',
      language: chatData.language,
      resultHandler: {
        action: InvocationResultAction.POST_MESSAGE,
        roomDetails: {
          roomID: room.id,
          communicationID: guidanceVc.communicationID,
        },
      },
    });

    return {
      id: message.id,
      success: true,
      question: chatData.question,
    };
  }

  public async resetUserHistory(agentInfo: AgentInfo): Promise<boolean> {
    const { guidanceRoom } = await this.userService.getUserOrFail(
      agentInfo.userID,
      {
        relations: { guidanceRoom: true },
      }
    );

    if (guidanceRoom) {
      await this.roomService.deleteRoom(guidanceRoom);
    }
    return true;
  }

  public isGuidanceEngineEnabled(): boolean {
    return this.configService.get('platform.guidance_engine.enabled', {
      infer: true,
    });
  }
}

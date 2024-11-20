import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { ConfigService } from '@nestjs/config';
import { GuidanceEngineAdapter } from '@services/adapters/chat-guidance-adapter/guidance.engine.adapter';
import { ChatGuidanceInput } from './dto/chat.guidance.dto.input';
import { AlkemioConfig } from '@src/types';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { InvocationResultAction } from '@services/ai-server/ai-persona-service/dto';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { IRoom } from '@domain/communication/room/room.interface';
import { RoomService } from '@domain/communication/room/room.service';
import { UserService } from '@domain/community/user/user.service';
import { IMessageGuidanceQuestionResult } from '@domain/communication/message.guidance.question.result/message.guidance.question.result.interface';
import { PlatformService } from '@platform/platform/platform.service';

export class ChatGuidanceService {
  constructor(
    private guidanceEngineAdapter: GuidanceEngineAdapter,
    private configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private aiServerAdapter: AiServerAdapter,
    private communicationAdapter: CommunicationAdapter,
    private roomService: RoomService,
    private userService: UserService,
    private platformService: PlatformService,
    private virtualContributorService: VirtualContributorService
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
      message: chatData.question,
      aiPersonaServiceID: guidanceVc.aiPersona.aiPersonaServiceID,
      userID: agentInfo.userID,
      displayName: 'Guidance',
      language: chatData.language,
      resultHandler: {
        action: InvocationResultAction.POST_REPLY,
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

  public async ingest(agentInfo: AgentInfo): Promise<boolean> {
    return this.guidanceEngineAdapter.sendIngest({
      userId: agentInfo.userID,
    });
  }

  public isGuidanceEngineEnabled(): boolean {
    return this.configService.get('platform.guidance_engine.enabled', {
      infer: true,
    });
  }
}

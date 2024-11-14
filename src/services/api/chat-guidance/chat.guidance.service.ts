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
import { RoomType } from '@common/enums/room.type';

export class ChatGuidanceService {
  constructor(
    private guidanceEngineAdapter: GuidanceEngineAdapter,
    private configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private aiServerAdapter: AiServerAdapter,
    private communicationAdapter: CommunicationAdapter,
    private roomService: RoomService,
    private virtualContributorService: VirtualContributorService
  ) {}

  private guidanceVcId = '00724d82-4f6f-427e-ae05-7054591da820' as const; // f68419ec-dc31-4663-9b4d-5dfecc90446e

  public async askQuestion(
    chatData: ChatGuidanceInput,
    agentInfo: AgentInfo
  ): Promise<void> {
    const guidanceVc =
      await this.virtualContributorService.getVirtualContributorOrFail(
        this.guidanceVcId,
        {
          relations: {
            aiPersona: true,
          },
        }
      );

    const roomID = await this.sendUserMessage(agentInfo, chatData.question);

    this.aiServerAdapter.invoke({
      message: chatData.question,
      aiPersonaServiceID: guidanceVc.aiPersona.aiPersonaServiceID,
      userID: agentInfo.userID,
      displayName: 'Guidance',
      language: chatData.language,
      resultHandler: {
        action: InvocationResultAction.POST_REPLY,
        roomDetails: {
          roomID,
          communicationID: guidanceVc.communicationID,
        },
      },
    });
  }

  public async resetUserHistory(agentInfo: AgentInfo): Promise<boolean> {
    const room = await this.getGuidanceRoom(agentInfo);
    if (room) {
      await this.roomService.deleteRoom(room);
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

  private async sendUserMessage(
    agentInfo: AgentInfo,
    message: string
  ): Promise<string> {
    const room = await this.getGuidanceRoom(agentInfo);

    await this.communicationAdapter.sendMessage({
      roomID: room.externalRoomID,
      senderCommunicationsID: agentInfo.communicationID,
      message,
    });
    return room.externalRoomID;
  }

  private getGuidanceRoomDisplayNameForUser(agentInfo: AgentInfo) {
    return `${agentInfo.communicationID}-guidance`;
  }

  public async getGuidanceRoom(agentInfo: AgentInfo): Promise<IRoom> {
    if (!agentInfo.communicationID) {
      throw new Error(
        `Unable to retrieve authenticated user communicationID ${agentInfo.userID}`
      );
    }

    const room = await this.roomService.findRoom({
      where: {
        displayName: this.getGuidanceRoomDisplayNameForUser(agentInfo),
        type: RoomType.GUIDANCE,
      },
    });

    if (room) {
      return room;
    } else {
      return this.createGuidanceRoom(agentInfo);
    }
  }

  private async createGuidanceRoom(agentInfo: AgentInfo): Promise<IRoom> {
    let room = await this.roomService.createRoom(
      this.getGuidanceRoomDisplayNameForUser(agentInfo),
      RoomType.GUIDANCE
    );
    room = await this.roomService.save(room);

    // TODO: Missing some room authorization initialization here!
    // this.roomAuthorizationService....;

    const guidanceVc =
      await this.virtualContributorService.getVirtualContributorOrFail(
        this.guidanceVcId,
        {
          relations: {
            aiPersona: true,
          },
        }
      );
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
}

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
import { CommunicationRoomResult } from '@services/adapters/communication-adapter/dto/communication.dto.room.result';

export class ChatGuidanceService {
  constructor(
    private guidanceEngineAdapter: GuidanceEngineAdapter,
    private configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private aiServerAdapter: AiServerAdapter,
    private communicationAdapter: CommunicationAdapter,
    private virtualContributorService: VirtualContributorService
  ) {}

  public async askQuestion(
    chatData: ChatGuidanceInput,
    agentInfo: AgentInfo
  ): Promise<void> {
    const guidanceVcId = 'f68419ec-dc31-4663-9b4d-5dfecc90446e';
    const guidanceVc =
      await this.virtualContributorService.getVirtualContributorOrFail(
        guidanceVcId,
        {
          relations: {
            aiPersona: true,
          },
        }
      );

    const roomID = await this.sendUserMessage(
      agentInfo,
      chatData.question,
      guidanceVc.communicationID
    );
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
      const roomDetails = await this.communicationAdapter.getCommunityRoom(
        room.id
      );
      roomDetails.messages.map(async message => {
        await this.communicationAdapter.deleteMessage({
          roomID: room.id,
          messageId: message.id,
          senderCommunicationsID: message.sender,
        });
      });
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
    message: string,
    guidanceVcCommId: string
  ) {
    const room = await this.getGuidanceRoom(agentInfo);
    let roomID;
    if (!room) {
      const roomName = `${agentInfo.communicationID}-guidance`;
      roomID = await this.communicationAdapter.createCommunityRoom(roomName);
    } else {
      roomID = room.id;
    }
    await this.communicationAdapter.addUserToRoom(
      roomID,
      agentInfo.communicationID
    );
    await this.communicationAdapter.addUserToRoom(roomID, guidanceVcCommId);

    await this.communicationAdapter.sendMessage({
      roomID,
      senderCommunicationsID: agentInfo.communicationID,
      message,
    });
    return roomID;
  }

  private async getGuidanceRoom(
    agentInfo: AgentInfo
  ): Promise<CommunicationRoomResult | undefined> {
    const roomName = `${agentInfo.communicationID}-guidance`;
    const rooms = await this.communicationAdapter.getCommunityRooms(
      agentInfo.communicationID
    );

    const room = rooms.find(room => room.displayName === roomName);
    return room;
  }
}

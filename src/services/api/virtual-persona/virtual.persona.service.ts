import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AgentInfo } from '@core/authentication/agent-info';
import { IVirtualPersonaQueryResult } from './dto/virtual.persona.query.result.dto';
import { ConfigurationTypes } from '@common/enums/configuration.type';
import { ConfigService } from '@nestjs/config';
import { VirtualPersonaInput } from './dto/virtual.persona.dto.input';
import { VirtualPersonaAdapter } from '@services/adapters/virtual-persona-adapter/virtual.persona.adapter';
import { VirtualPersonaType } from '@services/adapters/virtual-persona-adapter/virtual.persona.type';
import { SpaceService } from '@domain/challenge/space/space.service';
import { RoomService } from '@domain/communication/room/room.service';

export class VirtualPersonaService {
  constructor(
    private virtualPersonaAdapter: VirtualPersonaAdapter,
    private configService: ConfigService,
    private roomService: RoomService,
    private spaceService: SpaceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async askQuestion(
    chatData: VirtualPersonaInput,
    agentInfo: AgentInfo
  ): Promise<IVirtualPersonaQueryResult> {
    const space = await this.spaceService.getSpaceOrFail(chatData.spaceID, {
      relations: {
        profile: true,
      },
    });
    const room = await this.roomService.getRoomOrFail(chatData.roomID);
    const messages = await this.roomService.getMessages(room);

    const response = await this.virtualPersonaAdapter.sendQuery({
      userId: agentInfo.userID,
      question: chatData.question,
      prompt: chatData.prompt,
      virtualContributorType:
        chatData.virtualPersonaType ?? VirtualPersonaType.COMMUNITY_MANAGER,
      roomID: chatData.roomID,
      spaceID: chatData.spaceID,
      context: {
        space: {
          description: space.profile.description,
          tagline: space.profile.tagline,
        },
        messages,
      },
    });

    return response;
  }

  public async resetUserHistory(agentInfo: AgentInfo): Promise<boolean> {
    return this.virtualPersonaAdapter.sendReset({
      userId: agentInfo.userID,
    });
  }

  public async ingest(agentInfo: AgentInfo): Promise<boolean> {
    return this.virtualPersonaAdapter.sendIngest({
      userId: agentInfo.userID,
    });
  }

  public isGuidanceEngineEnabled(): boolean {
    const result = this.configService.get(ConfigurationTypes.PLATFORM)
      .guidance_engine?.enabled;

    return Boolean(result);
  }
}

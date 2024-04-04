import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AgentInfo } from '@core/authentication/agent-info';
import { IVirtualContributorQueryResult } from './dto/virtual.contributor.query.result.dto';
import { ConfigurationTypes } from '@common/enums/configuration.type';
import { ConfigService } from '@nestjs/config';
import { VirtualContributorInput } from './dto/virtual.contributor.dto.input';
import { VirtualContributorAdapter } from '@services/adapters/virtual-contributor-adapter/virtual.contributor.adapter';
import { VirtualContributorType } from '@services/adapters/virtual-contributor-adapter/virtual.contributor.type';
import { RoomService } from '@domain/communication/room/room.service';
import { SpaceService } from '@domain/challenge/space/space.service';

export class VirtualContributorService {
  constructor(
    private virtualContributorAdapter: VirtualContributorAdapter,
    private configService: ConfigService,
    private roomService: RoomService,
    private spaceService: SpaceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async askQuestion(
    chatData: VirtualContributorInput,
    agentInfo: AgentInfo
  ): Promise<IVirtualContributorQueryResult> {
    const space = await this.spaceService.getSpaceOrFail(chatData.spaceID, {
      relations: {
        profile: true,
      },
    });
    const room = await this.roomService.getRoomOrFail(chatData.roomID);
    const messages = await this.roomService.getMessages(room);

    const response = await this.virtualContributorAdapter.sendQuery({
      userId: agentInfo.userID,
      question: chatData.question,
      prompt: chatData.prompt,
      virtualContributorType:
        chatData.virtualContributorType ??
        VirtualContributorType.VIRTUAL_CONTRIBUTOR,
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
    return this.virtualContributorAdapter.sendReset({
      userId: agentInfo.userID,
    });
  }

  public async ingest(agentInfo: AgentInfo): Promise<boolean> {
    return this.virtualContributorAdapter.sendIngest({
      userId: agentInfo.userID,
    });
  }

  public isGuidanceEngineEnabled(): boolean {
    const result = this.configService.get(ConfigurationTypes.PLATFORM)
      .guidance_engine?.enabled;
    return Boolean(result);
  }
}

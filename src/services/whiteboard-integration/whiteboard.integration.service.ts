import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { WhiteboardService } from '@domain/common/whiteboard';
import { UserService } from '@domain/community/user/user.service';
import { IVerifiedCredential } from '@domain/agent/verified-credential/verified.credential.interface';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import {
  AccessGrantedInputData,
  ContentModifiedInputData,
  ContributionInputData,
  InfoInputData,
  SaveInputData,
  WhoInputData,
} from './inputs';
import { ContributionReporterService } from '../external/elasticsearch/contribution-reporter';
import { minCollaboratorsInRoom } from '../external/excalidraw-backend/types/defaults';
import { InfoOutputData } from './outputs/info.output.data';
import { AlkemioConfig } from '@src/types';
import {
  FetchContentData,
  FetchErrorData,
  FetchOutputData,
  SaveContentData,
  SaveErrorData,
  SaveOutputData,
} from './outputs';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { FetchInputData } from '@services/whiteboard-integration/inputs/fetch.input.data';

@Injectable()
export class WhiteboardIntegrationService {
  private readonly maxCollaboratorsInRoom: number;
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    private readonly authorizationService: AuthorizationService,
    private readonly authenticationService: AuthenticationService,
    private readonly whiteboardService: WhiteboardService,
    private readonly userService: UserService,
    private readonly contributionReporter: ContributionReporterService,
    private readonly communityResolver: CommunityResolverService,
    private readonly activityAdapter: ActivityAdapter,
    private readonly configService: ConfigService<AlkemioConfig, true>
  ) {
    this.maxCollaboratorsInRoom = this.configService.get(
      'collaboration.whiteboards.max_collaborators_in_room',
      { infer: true }
    );
  }

  public async accessGranted(data: AccessGrantedInputData): Promise<boolean> {
    try {
      const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
        data.whiteboardId
      );
      const agentInfo = await this.buildAgentInfo(data.userId);

      return this.authorizationService.isAccessGranted(
        agentInfo,
        whiteboard.authorization,
        data.privilege
      );
    } catch (e: any) {
      this.logger.error(e?.message, e?.stack, LogContext.AUTH);
      return false;
    }
  }

  public async info({
    userId,
    whiteboardId,
  }: InfoInputData): Promise<InfoOutputData> {
    const read = await this.accessGranted({
      userId,
      whiteboardId,
      privilege: AuthorizationPrivilege.READ,
    });

    if (!read) {
      return {
        read: false,
        update: false,
        maxCollaborators: undefined,
      };
    }

    const update = await this.accessGranted({
      userId,
      whiteboardId,
      privilege: AuthorizationPrivilege.UPDATE_CONTENT,
    });

    const maxCollaborators = (await this.whiteboardService.isMultiUser(
      whiteboardId
    ))
      ? this.maxCollaboratorsInRoom
      : minCollaboratorsInRoom;

    return { read, update, maxCollaborators };
  }

  public who(data: WhoInputData): Promise<AgentInfo> {
    return this.authenticationService.getAgentInfo(data.auth);
  }

  public async save(data: SaveInputData): Promise<SaveOutputData> {
    // does it exist?
    let whiteboard: IWhiteboard;
    try {
      whiteboard = await this.whiteboardService.getWhiteboardOrFail(
        data.whiteboardId,
        {
          select: { id: true },
        }
      );
    } catch (e: any) {
      this.logger.error(e?.message, e?.stack, LogContext.EXCALIDRAW_SERVER);
      return new SaveOutputData(
        new SaveErrorData(e?.message ?? JSON.stringify(e))
      );
    }
    // try saving
    try {
      whiteboard.content = data.content;
      await this.whiteboardService.save(whiteboard);
    } catch (e: any) {
      this.logger.error(e?.message, e?.stack, LogContext.EXCALIDRAW_SERVER);
      return new SaveOutputData(
        new SaveErrorData(e?.message ?? JSON.stringify(e))
      );
    }
    // return success on successful save
    return new SaveOutputData(new SaveContentData());
  }

  public async fetch(data: FetchInputData): Promise<FetchOutputData> {
    try {
      const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
        data.whiteboardId,
        {
          select: { id: true, content: true },
        }
      );
      return new FetchOutputData(new FetchContentData(whiteboard.content));
    } catch (e: any) {
      this.logger.error(e?.message, e?.stack, LogContext.EXCALIDRAW_SERVER);
      return new FetchOutputData(
        new FetchErrorData(e?.message ?? JSON.stringify(e))
      );
    }
  }

  public async contribution({
    whiteboardId,
    users,
  }: ContributionInputData): Promise<void> {
    const community =
      await this.communityResolver.getCommunityFromWhiteboardOrFail(
        whiteboardId
      );
    const levelZeroSpaceID =
      await this.communityResolver.getLevelZeroSpaceIdForCommunity(
        community.id
      );
    const wb = await this.whiteboardService.getProfile(whiteboardId);

    users.forEach(({ id, email }) => {
      this.contributionReporter.whiteboardContribution(
        {
          id: whiteboardId,
          name: wb.displayName,
          space: levelZeroSpaceID,
        },
        { id, email }
      );
    });
  }

  public contentModified({
    whiteboardId,
    triggeredBy,
  }: ContentModifiedInputData): void {
    this.activityAdapter
      .calloutWhiteboardContentModified({
        triggeredBy,
        whiteboardId,
      })
      .catch(err => {
        this.logger.error(err?.message, err?.stack, LogContext.ACTIVITY);
      });
  }

  private async buildAgentInfo(userId: string): Promise<AgentInfo> {
    const user = await this.userService.getUserOrFail(userId, {
      relations: { agent: true },
    });

    if (!user.agent) {
      throw new EntityNotInitializedException(
        `Agent not loaded for User: ${user.id}`,
        LogContext.AUTH,
        { userId }
      );
    }

    // const verifiedCredentials =
    //   await this.agentService.getVerifiedCredentials(user.agent);
    const verifiedCredentials = [] as IVerifiedCredential[];
    // construct the agent info object needed for isAccessGranted
    return {
      credentials: user.agent.credentials ?? [],
      verifiedCredentials,
    } as AgentInfo;
  }
}

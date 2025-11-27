import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { WhiteboardService } from '@domain/common/whiteboard';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
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
import { FetchInputData } from '@services/whiteboard-integration/inputs/fetch.input.data';
import { AgentInfoService } from '@core/authentication.agent.info/agent.info.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';

@Injectable()
export class WhiteboardIntegrationService {
  private readonly maxCollaboratorsInRoom: number;
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    private readonly authorizationService: AuthorizationService,
    private readonly authenticationService: AuthenticationService,
    private readonly whiteboardService: WhiteboardService,
    private readonly contributionReporter: ContributionReporterService,
    private readonly communityResolver: CommunityResolverService,
    private readonly activityAdapter: ActivityAdapter,
    private readonly agentInfoService: AgentInfoService,
    private readonly userLookupService: UserLookupService,
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
      const agentInfo = await this.agentInfoService.buildAgentInfoForUser(
        data.userId
      );

      return this.authorizationService.isAccessGranted(
        agentInfo,
        whiteboard.authorization,
        data.privilege
      );
    } catch (e: any) {
      this.logger.error(
        e?.message,
        e?.stack,
        LogContext.WHITEBOARD_INTEGRATION
      );
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
      : 1;

    return { read, update, maxCollaborators };
  }

  public async who(
    data: WhoInputData
  ): Promise<{ userID: string; email: string }> {
    const agentInfo = await this.authenticationService.getAgentInfo(data.auth);
    if (agentInfo.isAnonymous) {
      return { userID: '', email: '' };
    }
    const user = await this.userLookupService.getUserByUUID(agentInfo.userID);
    return { userID: agentInfo.userID, email: user?.email ?? '' };
  }

  public async save({
    whiteboardId,
    content,
  }: SaveInputData): Promise<SaveOutputData> {
    // try saving
    try {
      await this.whiteboardService.updateWhiteboardContent(
        whiteboardId,
        content
      );
    } catch (e: any) {
      const message = e?.message ?? JSON.stringify(e);
      this.logger.error(message, e?.stack, LogContext.WHITEBOARD_INTEGRATION);
      return new SaveOutputData(new SaveErrorData(message));
    }
    // return success on successful save
    return new SaveOutputData(new SaveContentData());
  }
  public async fetch(data: FetchInputData): Promise<FetchOutputData> {
    try {
      const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
        data.whiteboardId,
        {
          loadEagerRelations: false,
          select: { id: true, content: true },
        }
      );
      return new FetchOutputData(new FetchContentData(whiteboard.content));
    } catch (e: any) {
      this.logger.error(
        e?.message,
        e?.stack,
        LogContext.WHITEBOARD_INTEGRATION
      );
      return new FetchOutputData(
        new FetchErrorData(
          'An error occurred while fetching the whiteboard content.'
        )
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
        this.logger.error(
          err?.message,
          err?.stack,
          LogContext.WHITEBOARD_INTEGRATION
        );
      });
  }
}

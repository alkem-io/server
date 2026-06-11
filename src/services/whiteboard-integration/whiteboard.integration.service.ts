import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WhiteboardService } from '@domain/common/whiteboard';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { FetchInputData } from '@services/whiteboard-integration/inputs/fetch.input.data';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ContributionReporterService } from '../external/elasticsearch/contribution-reporter';
import {
  AccessGrantedInputData,
  ContentModifiedInputData,
  ContributionInputData,
  InfoInputData,
  SaveInputData,
} from './inputs';
import {
  FetchContentData,
  FetchErrorData,
  FetchOutputData,
  SaveContentData,
  SaveErrorData,
  SaveOutputData,
} from './outputs';
import { InfoOutputData } from './outputs/info.output.data';

@Injectable()
export class WhiteboardIntegrationService {
  private readonly maxCollaboratorsInRoom: number;
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    private readonly authorizationService: AuthorizationService,
    private readonly whiteboardService: WhiteboardService,
    private readonly contributionReporter: ContributionReporterService,
    private readonly communityResolver: CommunityResolverService,
    private readonly activityAdapter: ActivityAdapter,
    private readonly actorContextService: ActorContextService,
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

      const actorContext = await this.actorContextService.resolveActorContext(
        data.userId,
        data.guestName
      );

      return this.authorizationService.isAccessGranted(
        actorContext,
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
    guestName,
  }: InfoInputData): Promise<InfoOutputData> {
    const read = await this.accessGranted({
      userId,
      whiteboardId,
      privilege: AuthorizationPrivilege.READ,
      guestName,
    });

    if (!read) {
      return {
        read: false,
        update: false,
        maxCollaborators: undefined,
      };
    }

    // Anonymous users without a guest name are viewing via the normal space
    // route (not the public whiteboard URL). They should not receive write
    // access from the whiteboard's guest-access credential rule.
    // A `guest-*` userId (assigned by `who()`) indicates a legitimate guest
    // who provided a name, so only block truly anonymous identifiers.
    const normalizedUserId = userId?.trim().toLowerCase() ?? '';
    const isTrulyAnonymous =
      normalizedUserId.length === 0 || normalizedUserId === 'n/a';
    const isAnonymousWithoutGuestName = isTrulyAnonymous && !guestName?.trim();

    const update = isAnonymousWithoutGuestName
      ? false
      : await this.accessGranted({
          userId,
          whiteboardId,
          privilege: AuthorizationPrivilege.UPDATE_CONTENT,
          guestName,
        });

    const maxCollaborators = (await this.whiteboardService.isMultiUser(
      whiteboardId
    ))
      ? this.maxCollaboratorsInRoom
      : 1;

    return { read, update, maxCollaborators };
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

    users.forEach(({ id }) => {
      this.contributionReporter.whiteboardContribution(
        {
          id: whiteboardId,
          name: wb.displayName,
          space: levelZeroSpaceID,
        },
        { actorID: id }
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

import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { Injectable } from '@nestjs/common';
import { CalloutService } from './callout.service';

export interface ContributionDefaultSourceInput {
  sourceWhiteboardID?: string;
  sourceCalloutID?: string;
  clearWhiteboardContent?: boolean;
  whiteboardContent?: string;
  sourceStorageBucketID?: string;
  draftWhiteboardID?: string;
}

/**
 * The single authorization and ownership boundary for copying Whiteboard
 * contribution defaults. Public resolver inputs are normalized here into the
 * internal content + owning-bucket pair used by materialization.
 */
@Injectable()
export class CalloutContributionDefaultSourceService {
  constructor(
    private readonly calloutService: CalloutService,
    private readonly authorizationService: AuthorizationService,
    private readonly whiteboardService: WhiteboardService
  ) {}

  public async prepare(
    defaults: ContributionDefaultSourceInput | undefined,
    actorContext: ActorContext
  ): Promise<void> {
    if (!defaults) {
      return;
    }
    const selectedSources = [
      defaults.sourceWhiteboardID,
      defaults.sourceCalloutID,
      defaults.draftWhiteboardID,
      defaults.clearWhiteboardContent ? 'clear' : undefined,
    ].filter(Boolean);
    if (selectedSources.length > 1) {
      throw new ValidationException(
        'sourceWhiteboardID, sourceCalloutID, draftWhiteboardID, and clearWhiteboardContent are mutually exclusive',
        LogContext.WHITEBOARDS
      );
    }
    if (defaults.sourceCalloutID) {
      const sourceCallout = await this.calloutService.getCalloutOrFail(
        defaults.sourceCalloutID,
        {
          relations: {
            authorization: true,
            contributionDefaults: true,
            framing: { profile: { storageBucket: true } },
          },
        }
      );
      this.authorizationService.grantAccessOrFail(
        actorContext,
        sourceCallout.authorization,
        AuthorizationPrivilege.READ,
        'copy Whiteboard contribution default from source Callout'
      );
      defaults.whiteboardContent =
        sourceCallout.contributionDefaults?.whiteboardContent;
      defaults.sourceStorageBucketID = defaults.whiteboardContent
        ? sourceCallout.framing?.profile?.storageBucket?.id
        : undefined;
      if (defaults.whiteboardContent && !defaults.sourceStorageBucketID) {
        throw new ValidationException(
          'Source Callout has a Whiteboard default but no owning storage bucket',
          LogContext.WHITEBOARDS
        );
      }
      return;
    }
    // A draft is claimed and normalized to sourceWhiteboardID by the owning
    // Callout/TemplatesSet mutation before this service runs. Seeing the raw id
    // here would bypass actor/scope/purpose validation.
    if (defaults.draftWhiteboardID) {
      throw new ValidationException(
        'draftWhiteboardID must be claimed before preparing contribution defaults',
        LogContext.WHITEBOARDS
      );
    }
    if (!defaults.sourceWhiteboardID) {
      return;
    }
    const source = await this.whiteboardService.resolveContentSource(
      defaults.sourceWhiteboardID,
      actorContext
    );
    defaults.whiteboardContent = source.content;
    defaults.sourceStorageBucketID = source.storageBucketID;
  }
}

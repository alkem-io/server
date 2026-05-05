import { LogContext } from '@common/enums';
import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { CalloutContributionDefaults } from './callout.contribution.defaults.entity';
import { ICalloutContributionDefaults } from './callout.contribution.defaults.interface';
import {
  CreateCalloutContributionDefaultsInput,
  UpdateCalloutContributionDefaultsInput,
} from './dto';

@Injectable()
export class CalloutContributionDefaultsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private profileDocumentsService: ProfileDocumentsService,
    @InjectRepository(CalloutContributionDefaults)
    private calloutContributionDefaultsRepository: Repository<CalloutContributionDefaults>
  ) {}

  /**
   * Phase 1: in-memory build only. The `postDescription` markdown may
   * contain Alkemio document URLs that need re-homing into the parent
   * callout's storage bucket, but file-service-go work needs a persisted
   * bucket id — that's deferred to
   * {@link materializeCalloutContributionDefaultsContent}, called by
   * `CalloutService.materializeCalloutContent` after the parent's cascade
   * save populates real ids.
   */
  public createCalloutContributionDefaults(
    calloutContributionDefaultsData:
      | CreateCalloutContributionDefaultsInput
      | undefined
  ): ICalloutContributionDefaults {
    const calloutContributionDefaults = new CalloutContributionDefaults();
    if (calloutContributionDefaultsData) {
      calloutContributionDefaults.defaultDisplayName =
        calloutContributionDefaultsData.defaultDisplayName;
      calloutContributionDefaults.postDescription =
        calloutContributionDefaultsData.postDescription;
      calloutContributionDefaults.whiteboardContent =
        calloutContributionDefaultsData.whiteboardContent;
    }

    return calloutContributionDefaults;
  }

  /**
   * Phase 2: re-home internal Alkemio URLs in `postDescription` into the
   * parent callout's bucket. No-op if there's no description or no URL
   * to re-home. Saves the entity directly because the cascade-saved
   * parent isn't re-saved by the caller post-materialize.
   *
   * `rollback` is invoked on failure so a partial materialization rolls
   * back the top-level parent (e.g. the Template). Same convention as
   * the OrRollback helper: rollback failures are alert-worthy
   * (logger.error) but do not replace the original error.
   */
  public async materializeCalloutContributionDefaultsContent(
    defaults: ICalloutContributionDefaults,
    storageBucket: IStorageBucket,
    rollback: () => Promise<unknown>
  ): Promise<void> {
    if (!defaults.postDescription) return;
    try {
      const reuploaded =
        await this.profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket(
          defaults.postDescription,
          storageBucket
        );
      if (reuploaded !== defaults.postDescription) {
        defaults.postDescription = reuploaded;
        await this.calloutContributionDefaultsRepository.save(
          defaults as CalloutContributionDefaults
        );
      }
    } catch (error) {
      await rollback().catch(rollbackError => {
        const stack =
          rollbackError instanceof Error ? (rollbackError.stack ?? '') : '';
        this.logger.error?.(
          {
            message:
              'Rollback after CalloutContributionDefaults materialization failure also failed',
            calloutContributionDefaultsId: defaults.id,
            rollbackError: String(rollbackError),
          },
          stack,
          LogContext.COLLABORATION
        );
      });
      throw error;
    }
  }

  public updateCalloutContributionDefaults(
    calloutContributionDefaults: ICalloutContributionDefaults,
    calloutContributionDefaultsData: UpdateCalloutContributionDefaultsInput
  ): ICalloutContributionDefaults {
    if (calloutContributionDefaultsData.defaultDisplayName) {
      calloutContributionDefaults.defaultDisplayName =
        calloutContributionDefaultsData.defaultDisplayName;
    }

    if (calloutContributionDefaultsData.postDescription) {
      calloutContributionDefaults.postDescription =
        calloutContributionDefaultsData.postDescription;
    }

    if (calloutContributionDefaultsData.whiteboardContent) {
      calloutContributionDefaults.whiteboardContent =
        calloutContributionDefaultsData.whiteboardContent;
    }

    return calloutContributionDefaults;
  }

  public async delete(
    calloutContributionDefaults: ICalloutContributionDefaults
  ): Promise<ICalloutContributionDefaults> {
    const calloutContributionDefaultsID = calloutContributionDefaults.id;
    const result = await this.calloutContributionDefaultsRepository.remove(
      calloutContributionDefaults as CalloutContributionDefaults
    );
    result.id = calloutContributionDefaultsID;
    return result;
  }
}

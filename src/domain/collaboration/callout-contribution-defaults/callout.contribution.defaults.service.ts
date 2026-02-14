import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq } from 'drizzle-orm';
import { calloutContributionDefaults } from './callout.contribution.defaults.schema';
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
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb
  ) {}

  public async createCalloutContributionDefaults(
    calloutContributionDefaultsData:
      | CreateCalloutContributionDefaultsInput
      | undefined,
    storageBucket: IStorageBucket | undefined
  ): Promise<ICalloutContributionDefaults> {
    const calloutContributionDefaults = new CalloutContributionDefaults();
    if (calloutContributionDefaultsData) {
      calloutContributionDefaults.defaultDisplayName =
        calloutContributionDefaultsData.defaultDisplayName;

      // Reupload documents in markdown if the storage bucket is provided
      if (storageBucket) {
        calloutContributionDefaults.postDescription =
          await this.profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket(
            calloutContributionDefaultsData.postDescription ?? '',
            storageBucket
          );
      } else {
        calloutContributionDefaults.postDescription =
          calloutContributionDefaultsData.postDescription;
      }

      calloutContributionDefaults.whiteboardContent =
        calloutContributionDefaultsData.whiteboardContent;
    }

    return calloutContributionDefaults;
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
    defaults: ICalloutContributionDefaults
  ): Promise<ICalloutContributionDefaults> {
    const defaultsID = defaults.id;
    await this.db
      .delete(calloutContributionDefaults)
      .where(eq(calloutContributionDefaults.id, defaultsID));
    const result = { ...defaults };
    result.id = defaultsID;
    return result as ICalloutContributionDefaults;
  }
}

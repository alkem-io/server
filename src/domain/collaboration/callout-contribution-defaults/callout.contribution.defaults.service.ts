import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateCalloutContributionDefaultsInput } from './dto';
import { UpdateCalloutContributionDefaultsInput } from './dto';
import { ICalloutContributionDefaults } from './callout.contribution.defaults.interface';
import { CalloutContributionDefaults } from './callout.contribution.defaults.entity';

@Injectable()
export class CalloutContributionDefaultsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(CalloutContributionDefaults)
    private calloutResponseDefaultsRepository: Repository<CalloutContributionDefaults>
  ) {}

  public createCalloutContributionDefaults(
    calloutResponseDefaultsData?: CreateCalloutContributionDefaultsInput
  ): ICalloutContributionDefaults {
    const calloutResponseDefaults = new CalloutContributionDefaults();
    if (calloutResponseDefaultsData) {
      calloutResponseDefaults.postDescription =
        calloutResponseDefaultsData.postDescription;

      calloutResponseDefaults.whiteboardContent =
        calloutResponseDefaultsData.whiteboardContent;
    }

    return calloutResponseDefaults;
  }

  public updateCalloutContributionDefaults(
    calloutResponseDefaults: ICalloutContributionDefaults,
    calloutResponseDefaultsData: UpdateCalloutContributionDefaultsInput
  ): ICalloutContributionDefaults {
    if (calloutResponseDefaultsData.postDescription) {
      calloutResponseDefaults.postDescription =
        calloutResponseDefaultsData.postDescription;
    }

    if (calloutResponseDefaultsData.whiteboardContent) {
      calloutResponseDefaults.whiteboardContent =
        calloutResponseDefaultsData.whiteboardContent;
    }

    return calloutResponseDefaults;
  }

  public async delete(
    calloutResponseDefaults: ICalloutContributionDefaults
  ): Promise<ICalloutContributionDefaults> {
    const calloutResponseDefaultsID = calloutResponseDefaults.id;
    const result = await this.calloutResponseDefaultsRepository.remove(
      calloutResponseDefaults as CalloutContributionDefaults
    );
    result.id = calloutResponseDefaultsID;
    return result;
  }
}

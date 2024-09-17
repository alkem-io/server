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
    private calloutContributionDefaultsRepository: Repository<CalloutContributionDefaults>
  ) {}

  public createCalloutContributionDefaults(
    calloutContributionDefaultsData?: CreateCalloutContributionDefaultsInput
  ): ICalloutContributionDefaults {
    const calloutContributionDefaults = new CalloutContributionDefaults();
    if (calloutContributionDefaultsData) {
      calloutContributionDefaults.postDescription =
        calloutContributionDefaultsData.postDescription;

      calloutContributionDefaults.whiteboardContent =
        calloutContributionDefaultsData.whiteboardContent;
    }

    return calloutContributionDefaults;
  }

  public updateCalloutContributionDefaults(
    calloutContributionDefaults: ICalloutContributionDefaults,
    calloutContributionDefaultsData: UpdateCalloutContributionDefaultsInput
  ): ICalloutContributionDefaults {
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

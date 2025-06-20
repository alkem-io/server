import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateCalloutSettingsContributionInput } from './dto';
import { UpdateCalloutSettingsContributionInput } from './dto';
import { ICalloutSettingsContribution } from './callout.settings.contribution.interface';
import { CalloutSettingsContribution } from './callout.settings.contribution.entity';
import { CalloutAllowedContributors } from '@common/enums/callout.allowed.contributors';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';

@Injectable()
export class CalloutSettingsContributionService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(CalloutSettingsContribution)
    private calloutSettingsContributionRepository: Repository<CalloutSettingsContribution>
  ) {}

  public createCalloutSettingsContribution(
    calloutSettingsContributionData: CreateCalloutSettingsContributionInput
  ): ICalloutSettingsContribution {
    //!! Refactor this
    const calloutSettingsContribution = new CalloutSettingsContribution();
    calloutSettingsContribution.allowedTypes = [];
    calloutSettingsContribution.canAddContributions =
      CalloutAllowedContributors.MEMBERS;
    if (calloutSettingsContributionData.allowedTypes) {
      calloutSettingsContribution.allowedTypes =
        calloutSettingsContributionData.allowedTypes;
    }

    if (calloutSettingsContributionData.enabled) {
      calloutSettingsContribution.canAddContributions = // ??
        CalloutAllowedContributors.MEMBERS;
    }

    return calloutSettingsContribution;
  }

  public updateCalloutSettingsContributionInput(
    calloutType: CalloutType,
    policyData: CreateCalloutSettingsContributionInput | undefined
  ): CreateCalloutSettingsContributionInput {
    //!! Refactor this
    const allowedTypes: CalloutContributionType[] = [];
    switch (calloutType) {
      case CalloutType.LINK_COLLECTION:
        allowedTypes.push(CalloutContributionType.LINK);
        break;
      case CalloutType.POST_COLLECTION:
        allowedTypes.push(CalloutContributionType.POST);
        break;
      case CalloutType.WHITEBOARD_COLLECTION:
        allowedTypes.push(CalloutContributionType.WHITEBOARD);
        break;
    }
    if (!policyData) {
      const result: CreateCalloutSettingsContributionInput = {
        enabled: true,
        canAddContributions: CalloutAllowedContributors.MEMBERS,
        allowedTypes: allowedTypes,
      };
      return result;
    }
    policyData.allowedTypes = allowedTypes;
    return policyData;
  }

  public updateCalloutSettingsContribution(
    calloutSettingsContribution: ICalloutSettingsContribution,
    calloutSettingsContributionData: UpdateCalloutSettingsContributionInput
  ): ICalloutSettingsContribution {
    if (calloutSettingsContributionData.allowedTypes) {
      calloutSettingsContribution.allowedTypes =
        calloutSettingsContributionData.allowedTypes;
    }

    if (calloutSettingsContributionData.canAddContributions) {
      calloutSettingsContribution.canAddContributions =
        calloutSettingsContributionData.canAddContributions;
    }

    return calloutSettingsContribution;
  }

  public async delete(
    calloutSettingsContribution: ICalloutSettingsContribution
  ): Promise<ICalloutSettingsContribution> {
    const calloutSettingsContributionID = calloutSettingsContribution.id;
    const result = await this.calloutSettingsContributionRepository.remove(
      calloutSettingsContribution as CalloutSettingsContribution
    );
    result.id = calloutSettingsContributionID;
    return result;
  }
}

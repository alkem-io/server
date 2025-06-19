import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateCalloutSettingsContributionInput } from './dto';
import { UpdateCalloutSettingsContributionInput } from './dto';
import { ICalloutSettingsContribution } from './callout.settings.contribution.interface';
import { CalloutSettingsContribution } from './callout.settings.contribution.entity';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';

@Injectable()
export class CalloutSettingsContributionService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(CalloutSettingsContribution)
    private calloutContributionPolicyRepository: Repository<CalloutSettingsContribution>
  ) {}

  public createCalloutSettingsContribution(
    calloutContributionPolicyData: CreateCalloutSettingsContributionInput
  ): ICalloutSettingsContribution {
    const calloutContributionPolicy = new CalloutSettingsContribution();
    calloutContributionPolicy.allowedContributionTypes = [];
    calloutContributionPolicy.state = CalloutState.OPEN;
    if (calloutContributionPolicyData.allowedContributionTypes) {
      calloutContributionPolicy.allowedContributionTypes =
        calloutContributionPolicyData.allowedContributionTypes;
    }

    if (calloutContributionPolicyData.state) {
      calloutContributionPolicy.state = calloutContributionPolicyData.state;
    }

    return calloutContributionPolicy;
  }

  public updateCalloutSettingsContributionInput(
    calloutType: CalloutType,
    policyData: CreateCalloutSettingsContributionInput | undefined
  ): CreateCalloutSettingsContributionInput {
    //!! what does this do?
    const allowedContributionTypes: CalloutContributionType[] = [];
    switch (calloutType) {
      case CalloutType.LINK_COLLECTION:
        allowedContributionTypes.push(CalloutContributionType.LINK);
        break;
      case CalloutType.POST_COLLECTION:
        allowedContributionTypes.push(CalloutContributionType.POST);
        break;
      case CalloutType.WHITEBOARD_COLLECTION:
        allowedContributionTypes.push(CalloutContributionType.WHITEBOARD);
        break;
    }
    if (!policyData) {
      const result: CreateCalloutSettingsContributionInput = {
        state: CalloutState.OPEN,
        allowedContributionTypes: allowedContributionTypes,
      };
      return result;
    }
    policyData.allowedContributionTypes = allowedContributionTypes;
    return policyData;
  }

  public updateCalloutSettingsContribution(
    calloutContributionPolicy: ICalloutSettingsContribution,
    calloutContributionPolicyData: UpdateCalloutSettingsContributionInput
  ): ICalloutSettingsContribution {
    if (calloutContributionPolicyData.allowedContributionTypes) {
      calloutContributionPolicy.allowedContributionTypes =
        calloutContributionPolicyData.allowedContributionTypes;
    }

    if (calloutContributionPolicyData.state) {
      calloutContributionPolicy.state = calloutContributionPolicyData.state;
    }

    return calloutContributionPolicy;
  }

  public async delete(
    calloutContributionPolicy: ICalloutSettingsContribution
  ): Promise<ICalloutSettingsContribution> {
    const calloutContributionPolicyID = calloutContributionPolicy.id;
    const result = await this.calloutContributionPolicyRepository.remove(
      calloutContributionPolicy as CalloutSettingsContribution
    );
    result.id = calloutContributionPolicyID;
    return result;
  }
}

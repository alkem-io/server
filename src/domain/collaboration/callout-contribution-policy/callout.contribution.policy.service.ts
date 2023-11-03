import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateCalloutContributionPolicyInput } from './dto';
import { UpdateCalloutContributionPolicyInput } from './dto';
import { ICalloutContributionPolicy } from './callout.contribution.policy.interface';
import { CalloutContributionPolicy } from './callout.contribution.policy.entity';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';

@Injectable()
export class CalloutContributionPolicyService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(CalloutContributionPolicy)
    private calloutContributionPolicyRepository: Repository<CalloutContributionPolicy>
  ) {}

  public createCalloutContributionPolicy(
    calloutContributionPolicyData: CreateCalloutContributionPolicyInput
  ): ICalloutContributionPolicy {
    const calloutContributionPolicy = new CalloutContributionPolicy();
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

  public updateContributionPolicyInput(
    calloutType: CalloutType,
    policyData: CreateCalloutContributionPolicyInput | undefined
  ): CreateCalloutContributionPolicyInput {
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
      const result: CreateCalloutContributionPolicyInput = {
        state: CalloutState.OPEN,
        allowedContributionTypes: allowedContributionTypes,
      };
      return result;
    }
    policyData.allowedContributionTypes = allowedContributionTypes;
    return policyData;
  }

  public updateCalloutContributionPolicy(
    calloutContributionPolicy: ICalloutContributionPolicy,
    calloutContributionPolicyData: UpdateCalloutContributionPolicyInput
  ): ICalloutContributionPolicy {
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
    calloutContributionPolicy: ICalloutContributionPolicy
  ): Promise<ICalloutContributionPolicy> {
    const calloutContributionPolicyID = calloutContributionPolicy.id;
    const result = await this.calloutContributionPolicyRepository.remove(
      calloutContributionPolicy as CalloutContributionPolicy
    );
    result.id = calloutContributionPolicyID;
    return result;
  }
}

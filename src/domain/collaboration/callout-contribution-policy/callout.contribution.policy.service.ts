import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateCalloutContributionPolicyInput } from './dto';
import { UpdateCalloutContributionPolicyInput } from './dto';
import { ICalloutContributionPolicy } from './callout.contribution.policy.interface';
import { CalloutContributionPolicy } from './callout.contribution.policy.entity';

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
    if (calloutContributionPolicyData.allowedContributionTypes) {
      calloutContributionPolicy.allowedContributionTypes =
        calloutContributionPolicyData.allowedContributionTypes;
    }

    if (calloutContributionPolicyData.state) {
      calloutContributionPolicy.state = calloutContributionPolicyData.state;
    }

    return calloutContributionPolicy;
  }

  public updateCalloutContributionPolicy(
    calloutResponsePolicy: ICalloutContributionPolicy,
    calloutResponsePolicyData: UpdateCalloutContributionPolicyInput
  ): ICalloutContributionPolicy {
    if (calloutResponsePolicyData.allowedResponseTypes) {
      calloutResponsePolicy.allowedContributionTypes =
        calloutResponsePolicyData.allowedResponseTypes;
    }

    if (calloutResponsePolicyData.state) {
      calloutResponsePolicy.state = calloutResponsePolicyData.state;
    }

    return calloutResponsePolicy;
  }

  public async delete(
    calloutResponsePolicy: ICalloutContributionPolicy
  ): Promise<ICalloutContributionPolicy> {
    const calloutResponsePolicyID = calloutResponsePolicy.id;
    const result = await this.calloutContributionPolicyRepository.remove(
      calloutResponsePolicy as CalloutContributionPolicy
    );
    result.id = calloutResponsePolicyID;
    return result;
  }
}

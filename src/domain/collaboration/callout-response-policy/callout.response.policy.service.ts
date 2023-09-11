import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CreateCalloutResponsePolicyInput } from './dto/callout.response.policy.dto.create';
import { UpdateCalloutResponsePolicyInput } from './dto/callout.response.policy.dto.update';
import { ICalloutResponsePolicy } from './callout.response.policy.interface';
import { CalloutResponsePolicy } from './callout.response.policy.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CalloutResponsePolicyService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(CalloutResponsePolicy)
    private calloutResponsePolicyRepository: Repository<CalloutResponsePolicy>
  ) {}

  async createCalloutResponsePolicy(
    calloutResponsePolicyData: CreateCalloutResponsePolicyInput
  ): Promise<ICalloutResponsePolicy> {
    const calloutResponsePolicy = new CalloutResponsePolicy();
    if (calloutResponsePolicyData.allowedResponseTypes) {
      calloutResponsePolicy.allowedResponseTypes =
        calloutResponsePolicyData.allowedResponseTypes;
    }

    if (calloutResponsePolicyData.state) {
      calloutResponsePolicy.state = calloutResponsePolicyData.state;
    }

    return calloutResponsePolicy;
  }

  async updateCalloutResponsePolicy(
    calloutResponsePolicy: ICalloutResponsePolicy,
    calloutResponsePolicyData: UpdateCalloutResponsePolicyInput
  ): Promise<ICalloutResponsePolicy> {
    if (calloutResponsePolicyData.allowedResponseTypes) {
      calloutResponsePolicy.allowedResponseTypes =
        calloutResponsePolicyData.allowedResponseTypes;
    }

    if (calloutResponsePolicyData.state) {
      calloutResponsePolicy.state = calloutResponsePolicyData.state;
    }

    return calloutResponsePolicy;
  }

  async delete(
    calloutResponsePolicy: ICalloutResponsePolicy
  ): Promise<ICalloutResponsePolicy> {
    const calloutResponsePolicyID = calloutResponsePolicy.id;
    const result = await this.calloutResponsePolicyRepository.remove(
      calloutResponsePolicy as CalloutResponsePolicy
    );
    result.id = calloutResponsePolicyID;
    return result;
  }

  async save(
    calloutResponsePolicy: ICalloutResponsePolicy
  ): Promise<ICalloutResponsePolicy> {
    return await this.calloutResponsePolicyRepository.save(
      calloutResponsePolicy
    );
  }
}

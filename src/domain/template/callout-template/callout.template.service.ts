import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext, ProfileType } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CalloutTemplate } from './callout.template.entity';
import { ICalloutTemplate } from './callout.template.interface';
import { TemplateBaseService } from '../template-base/template.base.service';
import { CreateCalloutTemplateInput } from './dto/callout.template.dto.create';
import { UpdateCalloutTemplateInput } from './dto/callout.template.dto.update';
import { CalloutFramingService } from '@domain/collaboration/callout-framing/callout.framing.service';
import { CalloutContributionDefaultsService } from '@domain/collaboration/callout-contribution-defaults/callout.contribution.defaults.service';
import { CalloutContributionPolicyService } from '@domain/collaboration/callout-contribution-policy/callout.contribution.policy.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { AgentInfo } from '@core/authentication';

@Injectable()
export class CalloutTemplateService {
  constructor(
    @InjectRepository(CalloutTemplate)
    private calloutTemplateRepository: Repository<CalloutTemplate>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private templateBaseService: TemplateBaseService,
    private calloutFramingService: CalloutFramingService,
    private calloutContributionDefaultsService: CalloutContributionDefaultsService,
    private calloutContributionPolicyService: CalloutContributionPolicyService
  ) {}

  public async createCalloutTemplate(
    calloutTemplateData: CreateCalloutTemplateInput,
    storageAggregator: IStorageAggregator,
    agentInfo: AgentInfo
  ): Promise<ICalloutTemplate> {
    const calloutTemplate: ICalloutTemplate = new CalloutTemplate();
    await this.templateBaseService.initialise(
      calloutTemplate,
      calloutTemplateData,
      ProfileType.CALLOUT_TEMPLATE,
      storageAggregator
    );
    calloutTemplate.type = calloutTemplateData.type;
    calloutTemplate.framing =
      await this.calloutFramingService.createCalloutFraming(
        calloutTemplateData.framing,
        [],
        storageAggregator,
        agentInfo.userID
      );
    calloutTemplate.contributionDefaults =
      this.calloutContributionDefaultsService.createCalloutContributionDefaults(
        calloutTemplateData.contributionDefaults
      );
    const policyData =
      this.calloutContributionPolicyService.updateContributionPolicyInput(
        calloutTemplateData.type,
        calloutTemplateData.contributionPolicy
      );
    calloutTemplate.contributionPolicy =
      this.calloutContributionPolicyService.createCalloutContributionPolicy(
        policyData
      );

    return this.calloutTemplateRepository.save(calloutTemplate);
  }

  public async getCalloutTemplateOrFail(
    calloutTemplateID: string,
    options?: FindOneOptions<CalloutTemplate>
  ): Promise<ICalloutTemplate | never> {
    const calloutTemplate = await this.calloutTemplateRepository.findOne({
      ...options,
      where: {
        ...options?.where,
        id: calloutTemplateID,
      },
    });
    if (!calloutTemplate)
      throw new EntityNotFoundException(
        `Not able to locate CalloutTemplate with the specified ID: ${calloutTemplateID}`,
        LogContext.COMMUNICATION
      );
    return calloutTemplate;
  }

  async updateCalloutTemplate(
    calloutTemplateInput: ICalloutTemplate,
    calloutTemplateData: UpdateCalloutTemplateInput,
    agentInfo: AgentInfo
  ): Promise<ICalloutTemplate> {
    const calloutTemplate = await this.getCalloutTemplateOrFail(
      calloutTemplateInput.id,
      {
        relations: {
          profile: true,
          framing: true,
          contributionPolicy: true,
          contributionDefaults: true,
        },
      }
    );
    await this.templateBaseService.updateTemplateBase(
      calloutTemplate,
      calloutTemplateData
    );
    if (calloutTemplateData.framing) {
      calloutTemplate.framing =
        await this.calloutFramingService.updateCalloutFraming(
          calloutTemplate.framing,
          calloutTemplateData.framing,
          agentInfo
        );
    }
    if (calloutTemplateData.contributionDefaults) {
      calloutTemplate.contributionDefaults =
        this.calloutContributionDefaultsService.updateCalloutContributionDefaults(
          calloutTemplate.contributionDefaults,
          calloutTemplateData.contributionDefaults
        );
    }
    if (calloutTemplateData.contributionPolicy) {
      calloutTemplate.contributionPolicy =
        this.calloutContributionPolicyService.updateCalloutContributionPolicy(
          calloutTemplate.contributionPolicy,
          calloutTemplateData.contributionPolicy
        );
    }

    return this.calloutTemplateRepository.save(calloutTemplate);
  }

  public async deleteCalloutTemplate(
    calloutTemplateInput: ICalloutTemplate
  ): Promise<ICalloutTemplate> {
    const calloutTemplate = await this.getCalloutTemplateOrFail(
      calloutTemplateInput.id,
      {
        relations: {
          profile: true,
          framing: true,
          contributionDefaults: true,
          contributionPolicy: true,
        },
      }
    );
    const templateId: string = calloutTemplate.id;
    await this.templateBaseService.deleteEntities(calloutTemplate);
    await this.calloutFramingService.delete(calloutTemplate.framing);
    await this.calloutContributionDefaultsService.delete(
      calloutTemplate.contributionDefaults
    );
    await this.calloutContributionPolicyService.delete(
      calloutTemplate.contributionPolicy
    );
    const result = await this.calloutTemplateRepository.remove(
      calloutTemplate as CalloutTemplate
    );
    result.id = templateId;
    return result;
  }
}

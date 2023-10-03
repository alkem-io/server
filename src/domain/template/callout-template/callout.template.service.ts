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
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';

@Injectable()
export class CalloutTemplateService {
  constructor(
    @InjectRepository(CalloutTemplate)
    private calloutTemplateRepository: Repository<CalloutTemplate>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private templateBaseService: TemplateBaseService,
    private calloutFramingService: CalloutFramingService,
    private calloutResponseDefaultsService: CalloutContributionDefaultsService,
    private calloutResponsePolicyService: CalloutContributionPolicyService
  ) {}

  public async createCalloutTemplate(
    calloutTemplateData: CreateCalloutTemplateInput,
    parentStorageBucket: IStorageBucket
  ): Promise<ICalloutTemplate> {
    const calloutTemplate: ICalloutTemplate = new CalloutTemplate();
    await this.templateBaseService.initialise(
      calloutTemplate,
      calloutTemplateData,
      ProfileType.CALLOUT_TEMPLATE,
      parentStorageBucket
    );
    calloutTemplate.framing =
      await this.calloutFramingService.createCalloutFraming(
        calloutTemplateData.framing,
        parentStorageBucket
      );
    calloutTemplate.responseDefaults =
      this.calloutResponseDefaultsService.createCalloutContributionDefaults(
        calloutTemplateData.responseDefaults
      );
    calloutTemplate.responsePolicy =
      this.calloutResponsePolicyService.createCalloutContributionPolicy(
        calloutTemplateData.responsePolicy
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
    calloutTemplateData: UpdateCalloutTemplateInput
  ): Promise<ICalloutTemplate> {
    const calloutTemplate = await this.getCalloutTemplateOrFail(
      calloutTemplateInput.id,
      {
        relations: {
          profile: true,
          framing: true,
          responsePolicy: true,
          responseDefaults: true,
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
          calloutTemplateData.framing
        );
    }
    if (calloutTemplateData.responseDefaults) {
      calloutTemplate.responseDefaults =
        this.calloutResponseDefaultsService.updateCalloutContributionDefaults(
          calloutTemplate.responseDefaults,
          calloutTemplateData.responseDefaults
        );
    }
    if (calloutTemplateData.responsePolicy) {
      calloutTemplate.responsePolicy =
        this.calloutResponsePolicyService.updateCalloutContributionPolicy(
          calloutTemplate.responsePolicy,
          calloutTemplateData.responsePolicy
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
          responseDefaults: true,
          responsePolicy: true,
        },
      }
    );
    const templateId: string = calloutTemplate.id;
    await this.templateBaseService.deleteEntities(calloutTemplate);
    await this.calloutFramingService.delete(calloutTemplate.framing);
    await this.calloutResponseDefaultsService.delete(
      calloutTemplate.responseDefaults
    );
    await this.calloutResponsePolicyService.delete(
      calloutTemplate.responsePolicy
    );
    const result = await this.calloutTemplateRepository.remove(
      calloutTemplate as CalloutTemplate
    );
    result.id = templateId;
    return result;
  }
}

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CalloutTemplate } from './callout.template.entity';
import { ICalloutTemplate } from './callout.template.interface';
import { TemplateBaseService } from '../template-base/template.base.service';
import { CreateCalloutTemplateInput } from './dto/callout.template.dto.create';
import { UpdateCalloutTemplateInput } from './dto/callout.template.dto.update';
import { CalloutFramingService } from '@domain/collaboration/callout-framing/callout.framing.service';
import { CalloutResponseDefaultsService } from '@domain/collaboration/callout-response-defaults/callout.response.defaults.service';
import { CalloutResponsePolicyService } from '@domain/collaboration/callout-response-policy/callout.response.policy.service';

@Injectable()
export class CalloutTemplateService {
  constructor(
    @InjectRepository(CalloutTemplate)
    private calloutTemplateRepository: Repository<CalloutTemplate>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private templateBaseService: TemplateBaseService,
    private calloutFramingService: CalloutFramingService,
    private calloutResponseDefaultsService: CalloutResponseDefaultsService,
    private calloutResponsePolicyService: CalloutResponsePolicyService
  ) {}

  async createCalloutTemplate(
    calloutTemplateData: CreateCalloutTemplateInput
  ): Promise<ICalloutTemplate> {
    const calloutTemplate: ICalloutTemplate = new CalloutTemplate();
    await this.templateBaseService.initialise(
      calloutTemplate,
      calloutTemplateData
    );
    calloutTemplate.framing =
      await this.calloutFramingService.createCalloutFraming(
        calloutTemplateData.framing
      );
    calloutTemplate.responseDefaults =
      await this.calloutResponseDefaultsService.createCalloutResponseDefaults(
        calloutTemplateData.responseDefaults
      );
    calloutTemplate.responsePolicy =
      await this.calloutResponsePolicyService.createCalloutResponsePolicy(
        calloutTemplateData.responsePolicy
      );

    return await this.calloutTemplateRepository.save(calloutTemplate);
  }

  async getCalloutTemplateOrFail(
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
        relations: ['profile', 'framing', 'responsePolicy', 'responseDefaults'],
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
        await this.calloutResponseDefaultsService.updateCalloutResponseDefaults(
          calloutTemplate.responseDefaults,
          calloutTemplateData.responseDefaults
        );
    }
    if (calloutTemplateData.responsePolicy) {
      calloutTemplate.responsePolicy =
        await this.calloutResponsePolicyService.updateCalloutResponsePolicy(
          calloutTemplate.responsePolicy,
          calloutTemplateData.responsePolicy
        );
    }

    return await this.calloutTemplateRepository.save(calloutTemplate);
  }

  async deleteCalloutTemplate(
    calloutTemplateInput: ICalloutTemplate
  ): Promise<ICalloutTemplate> {
    const calloutTemplate = await this.getCalloutTemplateOrFail(
      calloutTemplateInput.id,
      {
        relations: ['profile', 'framing', 'responsePolicy', 'responseDefaults'],
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

  async save(calloutTemplate: ICalloutTemplate): Promise<ICalloutTemplate> {
    return await this.calloutTemplateRepository.save(calloutTemplate);
  }

  async getCountInTemplatesSet(templatesSetID: string): Promise<number> {
    return await this.calloutTemplateRepository.countBy({
      templatesSet: {
        id: templatesSetID,
      },
    });
  }
}

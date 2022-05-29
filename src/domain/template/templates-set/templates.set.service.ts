import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { TemplatesSet } from './templates.set.entity';
import { ITemplatesSet } from './templates.set.interface';
import { IAspectTemplate } from '../aspect-template/aspect.template.interface';
import { AspectTemplateService } from '../aspect-template/aspect.template.service';
import { DeleteAspectTemplateInput } from './dto/aspect.template.dto.delete';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { templatesSetDefaults } from './templates.set.defaults';
import { CreateAspectTemplateInput } from '../aspect-template/dto/aspect.template.dto.create';

@Injectable()
export class TemplatesSetService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(TemplatesSet)
    private templatesSetRepository: Repository<TemplatesSet>,
    private aspectTemplateService: AspectTemplateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createTemplatesSet(): Promise<ITemplatesSet> {
    const templatesSet: ITemplatesSet = TemplatesSet.create();
    templatesSet.authorization = new AuthorizationPolicy();
    templatesSet.aspectTemplates = [];
    for (const aspectTemplateDefault of templatesSetDefaults.aspects) {
      const aspectTemplate =
        await this.aspectTemplateService.createAspectTemplate(
          aspectTemplateDefault
        );
      templatesSet.aspectTemplates.push(aspectTemplate);
    }

    return await this.templatesSetRepository.save(templatesSet);
  }

  async getTemplatesSetOrFail(
    templatesSetID: string,
    options?: FindOneOptions<TemplatesSet>
  ): Promise<ITemplatesSet> {
    const templatesSet = await TemplatesSet.findOne(
      { id: templatesSetID },
      options
    );
    if (!templatesSet)
      throw new EntityNotFoundException(
        `TemplatesSet with id(${templatesSetID}) not found!`,
        LogContext.COMMUNITY
      );
    return templatesSet;
  }

  async deleteTemplatesSet(templatesSetID: string): Promise<ITemplatesSet> {
    const templatesSet = await this.getTemplatesSetOrFail(templatesSetID, {
      relations: ['authorization', 'aspectTemplates'],
    });

    if (templatesSet.authorization)
      await this.authorizationPolicyService.delete(templatesSet.authorization);

    return await this.templatesSetRepository.remove(
      templatesSet as TemplatesSet
    );
  }

  async getAspectTemplates(
    templatesSet: ITemplatesSet
  ): Promise<IAspectTemplate[]> {
    const templatesSetPopulated = await this.getTemplatesSetOrFail(
      templatesSet.id,
      {
        relations: ['aspectTemplates'],
      }
    );
    if (!templatesSetPopulated.aspectTemplates) {
      throw new EntityNotInitializedException(
        `TemplatesSet not initialized: ${templatesSetPopulated.id}`,
        LogContext.COMMUNITY
      );
    }
    return templatesSetPopulated.aspectTemplates;
  }

  async createAspectTemplate(
    templatesSet: ITemplatesSet,
    aspectTemplateInput: CreateAspectTemplateInput
  ): Promise<IAspectTemplate> {
    const aspectTemplate =
      await this.aspectTemplateService.createAspectTemplate(
        aspectTemplateInput
      );
    templatesSet.aspectTemplates = await this.getAspectTemplates(templatesSet);
    templatesSet.aspectTemplates.push(aspectTemplate);
    await this.templatesSetRepository.save(templatesSet);
    return aspectTemplate;
  }

  async deleteAspectTemplate(
    templatesSet: ITemplatesSet,
    deleteData: DeleteAspectTemplateInput
  ): Promise<IAspectTemplate> {
    // check the specified aspect template is in this templates set
    const aspectTemplates = await this.getAspectTemplates(templatesSet);
    const aspectTemplateInSet = aspectTemplates.find(
      aspectTemplate => aspectTemplate.id === deleteData.aspectTemplateID
    );
    if (!aspectTemplateInSet) {
      throw new EntityNotFoundException(
        `TemplatesSet (${templatesSet.id}) does not contain the specified aspectTempalte: ${deleteData.aspectTemplateID}`,
        LogContext.COMMUNITY
      );
    }
    return this.aspectTemplateService.deleteAspectTemplate(aspectTemplateInSet);
  }
}

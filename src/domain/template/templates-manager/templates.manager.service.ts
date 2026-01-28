import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { TemplateDefaultType } from '@common/enums/template.default.type';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { ITemplate } from '../template/template.interface';
import { ITemplateDefault } from '../template-default/template.default.interface';
import { TemplateDefaultService } from '../template-default/template.default.service';
import { ITemplatesSet } from '../templates-set/templates.set.interface';
import { TemplatesSetService } from '../templates-set/templates.set.service';
import { CreateTemplatesManagerInput } from './dto/templates.manager.dto.create';
import { TemplatesManager } from './templates.manager.entity';
import { ITemplatesManager } from './templates.manager.interface';

@Injectable()
export class TemplatesManagerService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(TemplatesManager)
    private templatesManagerRepository: Repository<TemplatesManager>,
    private templatesSetService: TemplatesSetService,
    private templateDefaultService: TemplateDefaultService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createTemplatesManager(
    templatesManagerData: CreateTemplatesManagerInput
  ): Promise<ITemplatesManager> {
    const templatesManager: ITemplatesManager = TemplatesManager.create();
    templatesManager.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.TEMPLATES_MANAGER
    );
    templatesManager.templateDefaults = [];
    templatesManager.templatesSet =
      await this.templatesSetService.createTemplatesSet();

    for (const templateDefaultData of templatesManagerData.templateDefaultsData) {
      const templateDefault =
        this.templateDefaultService.createTemplateDefault(templateDefaultData);
      templatesManager.templateDefaults.push(templateDefault);
    }

    return await this.templatesManagerRepository.save(templatesManager);
  }

  async getTemplatesManagerOrFail(
    templatesManagerID: string,
    options?: FindOneOptions<TemplatesManager>
  ): Promise<ITemplatesManager | never> {
    const templatesManager = await this.templatesManagerRepository.findOne({
      ...options,
      where: {
        id: templatesManagerID,
        ...(options?.where || {}),
      },
    });
    if (!templatesManager)
      throw new EntityNotFoundException(
        `TemplatesManager with id(${templatesManagerID}) not found!`,
        LogContext.TEMPLATES
      );
    return templatesManager;
  }

  async deleteTemplatesManager(
    templatesManagerID: string
  ): Promise<ITemplatesManager> {
    const templatesManager = await this.getTemplatesManagerOrFail(
      templatesManagerID,
      {
        relations: {
          authorization: true,
          templateDefaults: true,
          templatesSet: true,
        },
      }
    );

    if (
      !templatesManager.authorization ||
      !templatesManager.templateDefaults ||
      !templatesManager.templatesSet
    ) {
      throw new EntityNotFoundException(
        `Unable to find authorization, templateDefaults or templatesSet on TemplatesManager with id: ${templatesManagerID}`,
        LogContext.TEMPLATES
      );
    }

    await this.authorizationPolicyService.delete(
      templatesManager.authorization
    );

    for (const templateDefault of templatesManager.templateDefaults) {
      await this.templateDefaultService.removeTemplateDefault(templateDefault);
    }
    await this.templatesSetService.deleteTemplatesSet(
      templatesManager.templatesSet.id
    );

    const result = await this.templatesManagerRepository.remove(
      templatesManager as TemplatesManager
    );
    result.id = templatesManagerID;
    return result;
  }

  public async getTemplateDefault(
    templatesManagerID: string,
    templateDefaultType: TemplateDefaultType
  ): Promise<ITemplateDefault> {
    const templateDefaults = await this.getTemplateDefaults(templatesManagerID);
    const templateDefault = templateDefaults.find(
      td => td.type === templateDefaultType
    );
    if (!templateDefault) {
      throw new EntityNotFoundException(
        `No TemplateDefault found with type: ${templateDefaultType} in TemplatesManager with id: ${templatesManagerID}`,
        LogContext.TEMPLATES
      );
    }
    return templateDefault;
  }

  public async getTemplateFromTemplateDefault(
    templatesManagerID: string,
    templateDefaultType: TemplateDefaultType
  ): Promise<ITemplate> {
    const templateDefault = await this.getTemplateDefault(
      templatesManagerID,
      templateDefaultType
    );
    if (!templateDefault.template) {
      throw new EntityNotFoundException(
        `No Template for TemplateDefault found with type: ${templateDefaultType} in TemplatesManager with id: ${templatesManagerID}: ${templateDefault.id}`,
        LogContext.TEMPLATES
      );
    }
    return templateDefault.template;
  }

  public async getTemplateDefaults(
    templatesManagerID: string
  ): Promise<ITemplateDefault[]> {
    const templatesManager = await this.getTemplatesManagerOrFail(
      templatesManagerID,
      {
        relations: {
          templateDefaults: {
            authorization: true,
          },
        },
      }
    );
    if (!templatesManager.templateDefaults) {
      throw new RelationshipNotFoundException(
        `No TemplateDefaults found in TemplatesManager with id: ${templatesManagerID}`,
        LogContext.TEMPLATES
      );
    }
    return templatesManager.templateDefaults;
  }

  public async save(
    templatesManager: ITemplatesManager
  ): Promise<ITemplatesManager> {
    return await this.templatesManagerRepository.save(templatesManager);
  }

  async getTemplatesSetOrFail(
    templatesManagerID: string
  ): Promise<ITemplatesSet> {
    const templatesManager = await this.getTemplatesManagerOrFail(
      templatesManagerID,
      {
        relations: { templatesSet: true },
      }
    );

    if (!templatesManager || !templatesManager.templatesSet) {
      throw new RelationshipNotFoundException(
        `Unable to find templatesSet for TemplatesManager with id: ${templatesManager.id}`,
        LogContext.TEMPLATES
      );
    }

    return templatesManager.templatesSet;
  }
}

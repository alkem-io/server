import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { TemplateService } from '../template/template.service';
import { CreateTemplateDefaultInput } from './dto/template.default.dto.create';
import { UpdateTemplateDefaultTemplateInput } from './dto/template.default.dto.update';
import { TemplateDefault } from './template.default.entity';
import { ITemplateDefault } from './template.default.interface';

@Injectable()
export class TemplateDefaultService {
  constructor(
    @InjectRepository(TemplateDefault)
    private templateDefaultRepository: Repository<TemplateDefault>,
    private templateService: TemplateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public createTemplateDefault(
    templateDefaultData: CreateTemplateDefaultInput
  ): ITemplateDefault {
    const templateDefault: ITemplateDefault = new TemplateDefault();

    templateDefault.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.TEMPLATE_DEFAULT
    );

    templateDefault.type = templateDefaultData.type;
    templateDefault.template = templateDefaultData.template;
    templateDefault.allowedTemplateType =
      templateDefaultData.allowedTemplateType;

    return templateDefault;
  }

  public async updateTemplateDefaultTemplate(
    templateDefault: ITemplateDefault,
    templateDefaultData: UpdateTemplateDefaultTemplateInput
  ): Promise<ITemplateDefault> {
    const template = await this.templateService.getTemplateOrFail(
      templateDefaultData.templateID
    );
    if (template.type !== templateDefault.allowedTemplateType) {
      throw new ValidationException(
        `Template type(${template.type}) does not match allowed template type(${templateDefault.allowedTemplateType})`,
        LogContext.TEMPLATES
      );
    }
    templateDefault.template = template;

    return await this.save(templateDefault);
  }

  public async getTemplateDefaultOrFail(
    templateDefaultID: string,
    options?: FindOneOptions<TemplateDefault>
  ): Promise<ITemplateDefault | never> {
    const templateDefault = await this.templateDefaultRepository.findOne({
      where: { id: templateDefaultID },
      ...options,
    });

    if (!templateDefault)
      throw new EntityNotFoundException(
        `No TemplateDefault found with the given id: ${templateDefaultID}`,
        LogContext.TEMPLATES
      );
    return templateDefault;
  }

  public async removeTemplateDefault(
    templateDefault: ITemplateDefault
  ): Promise<boolean> {
    await this.templateDefaultRepository.remove(
      templateDefault as TemplateDefault
    );
    return true;
  }

  public save(templateDefault: ITemplateDefault): Promise<ITemplateDefault> {
    return this.templateDefaultRepository.save(templateDefault);
  }
}

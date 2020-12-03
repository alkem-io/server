import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { TemplateInput } from './template.dto';
import { Template } from './template.entity';
import { ITemplate } from './template.interface';

@Injectable()
export class TemplateService {
  constructor(
    private userService: UserService,
    @InjectRepository(Template)
    private templateRepository: Repository<Template>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async initialiseMembers(template: ITemplate): Promise<ITemplate> {
    if (!template.users) {
      template.users = [];
    }

    return template;
  }

  async getTemplateByID(templateID: number): Promise<ITemplate> {
    const Opportunity = await this.templateRepository.findOne({
      where: { id: templateID },
    });
    if (!Opportunity)
      throw new Error(`Unable to find Template with ID: ${templateID}`);
    return Opportunity;
  }

  async createTemplate(templateData: TemplateInput): Promise<ITemplate> {
    const template = new Template(templateData.name, templateData.description);
    await this.initialiseMembers(template);
    await this.templateRepository.save(template);
    return template;
  }

  async getTemplates(ecoverseId: number): Promise<Template[]> {
    const templates = await this.templateRepository.find({
      where: { ecoverse: { id: ecoverseId } },
    });
    return templates || [];
  }

  async save(template: ITemplate): Promise<ITemplate> {
    await this.templateRepository.save(template);
    return template;
  }
}

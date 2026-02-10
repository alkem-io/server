import { LogContext } from '@common/enums';
import { TemplateDefaultType } from '@common/enums/template.default.type';
import { RelationshipNotFoundException } from '@common/exceptions';
import { CreateCalloutInput } from '@domain/collaboration/callout/dto';
import { ITemplate } from '@domain/template/template/template.interface';
import { TemplateService } from '@domain/template/template/template.service';
import { ITemplateDefault } from '@domain/template/template-default/template.default.interface';
import { TemplatesManagerService } from '@domain/template/templates-manager/templates.manager.service';
import { ITemplatesSet } from '@domain/template/templates-set/templates.set.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { PlatformService } from '@platform/platform/platform.service';
import { InputCreatorService } from '@services/api/input-creator/input.creator.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class PlatformTemplatesService {
  constructor(
    private platformService: PlatformService,
    private templatesManagerService: TemplatesManagerService,
    private templateService: TemplateService,
    private inputCreatorService: InputCreatorService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async getPlatformTemplatesSet(): Promise<ITemplatesSet> {
    const platformTemplatesManager =
      await this.platformService.getTemplatesManagerOrFail();
    return await this.templatesManagerService.getTemplatesSetOrFail(
      platformTemplatesManager.id
    );
  }

  public async getPlatformTemplateDefault(
    platformDefaultTemplateType: TemplateDefaultType
  ): Promise<ITemplateDefault> {
    const platformTemplatesManager =
      await this.platformService.getTemplatesManagerOrFail();
    const templateDefault =
      await this.templatesManagerService.getTemplateDefault(
        platformTemplatesManager.id,
        platformDefaultTemplateType
      );
    return templateDefault;
  }

  public async getPlatformDefaultTemplateByType(
    platformDefaultTemplateType: TemplateDefaultType
  ): Promise<ITemplate> {
    const platformTemplatesManager =
      await this.platformService.getTemplatesManagerOrFail();
    const template =
      await this.templatesManagerService.getTemplateFromTemplateDefault(
        platformTemplatesManager.id,
        platformDefaultTemplateType
      );
    return template;
  }

  public async getCreateCalloutInputsFromTemplate(
    platformDefaultTemplateType: TemplateDefaultType
  ): Promise<CreateCalloutInput[]> {
    const template = await this.getPlatformDefaultTemplateByType(
      platformDefaultTemplateType
    );
    const templateID = template.id;
    const contentSpaceFromTemplate =
      await this.templateService.getTemplateContentSpace(templateID);
    if (!contentSpaceFromTemplate || !contentSpaceFromTemplate.collaboration) {
      throw new RelationshipNotFoundException(
        `Collaboration not found for the template content space: ${contentSpaceFromTemplate.id}`,
        LogContext.TEMPLATES
      );
    }
    const collaborationTemplateInput =
      await this.inputCreatorService.buildCreateCollaborationInputFromCollaboration(
        contentSpaceFromTemplate.collaboration.id
      );
    return collaborationTemplateInput.calloutsSetData.calloutsData || [];
  }
}

import { TemplateDefaultType } from '@common/enums/template.default.type';
import { CreateCalloutInput } from '@domain/collaboration/callout/dto';
import { ITemplate } from '@domain/template/template/template.interface';
import { TemplateService } from '@domain/template/template/template.service';
import { TemplatesManagerService } from '@domain/template/templates-manager/templates.manager.service';
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
    const collaborationFromTemplate =
      await this.templateService.getTemplateContentSpace(templateID);
    const collaborationTemplateInput =
      await this.inputCreatorService.buildCreateCollaborationInputFromCollaboration(
        collaborationFromTemplate.id
      );
    return collaborationTemplateInput.calloutsSetData.calloutsData || [];
  }
}

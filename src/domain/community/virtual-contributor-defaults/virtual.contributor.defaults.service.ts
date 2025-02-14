import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { TemplateService } from '@domain/template/template/template.service';
import { InputCreatorService } from '@services/api/input-creator/input.creator.service';
import { TemplatesManagerService } from '@domain/template/templates-manager/templates.manager.service';
import { TemplateDefaultType } from '@common/enums/template.default.type';
import { PlatformService } from '@platform/platform/platform.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AiPersonaBodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';
import { CreateKnowledgeBaseInput } from '@domain/common/knowledge-base/dto/knowledge.base.dto.create';
import { CalloutGroupName } from '@common/enums/callout.group.name';
import { ICalloutGroup } from '@domain/collaboration/callouts-set/dto/callout.group.interface';
import { NamingService } from '@services/infrastructure/naming/naming.service';

@Injectable()
export class VirtualContributorDefaultsService {
  constructor(
    private templateService: TemplateService,
    private inputCreatorService: InputCreatorService,
    private platformService: PlatformService,
    private templatesManagerService: TemplatesManagerService,
    private namingService: NamingService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createVirtualContributorNameID(
    displayName: string
  ): Promise<string> {
    const base = `${displayName}`;
    const reservedNameIDs =
      await this.namingService.getReservedNameIDsInVirtualContributors(); // This will need to be smarter later
    return this.namingService.createNameIdAvoidingReservedNameIDs(
      base,
      reservedNameIDs
    );
  }

  public async createKnowledgeBaseInput(
    knowledgeBaseData?: CreateKnowledgeBaseInput,
    bodyOfKnowledgeType?: AiPersonaBodyOfKnowledgeType
  ): Promise<CreateKnowledgeBaseInput> {
    // Create default data for a knowledge base if not provided
    let result = knowledgeBaseData;
    if (!result) {
      result = {
        profile: {
          displayName: '',
        },
        calloutsSetData: {},
      };
    }

    if (!result.profile) {
      result.profile = {
        displayName: '',
      };
    }

    if (!result.calloutsSetData) {
      result.calloutsSetData = {};
    }

    if (result.profile.displayName === '') {
      result.profile.displayName = 'Knowledge Base';
    }

    const defaultCalloutGroups: ICalloutGroup[] = [
      {
        displayName: CalloutGroupName.KNOWLEDGE,
        description: 'Knowledge callouts for this VC',
      },
    ];

    if (!result.calloutsSetData.calloutsData) {
      result.calloutsSetData.calloutsData = [];
    }

    const providedCallouts = knowledgeBaseData?.calloutsSetData?.calloutsData;
    if (!providedCallouts) {
      if (
        bodyOfKnowledgeType ===
        AiPersonaBodyOfKnowledgeType.ALKEMIO_KNOWLEDGE_BASE
      ) {
        // get the default templates
        const platformTemplatesManager =
          await this.platformService.getTemplatesManagerOrFail();
        const knowledgeTemplate =
          await this.templatesManagerService.getTemplateFromTemplateDefault(
            platformTemplatesManager.id,
            TemplateDefaultType.PLATFORM_SUBSPACE_KNOWLEDGE
          );
        const templateID = knowledgeTemplate.id;
        const collaborationFromTemplate =
          await this.templateService.getCollaboration(templateID);
        const collaborationTemplateInput =
          await this.inputCreatorService.buildCreateCollaborationInputFromCollaboration(
            collaborationFromTemplate.id
          );
        result.calloutsSetData.calloutsData =
          collaborationTemplateInput.calloutsSetData.calloutsData;
      } else {
        result.calloutsSetData.calloutsData = [];
      }
    }

    // Fix the groups for now
    result.calloutsSetData.calloutGroups = defaultCalloutGroups;
    result.calloutsSetData.defaultCalloutGroupName = CalloutGroupName.KNOWLEDGE;

    return result;
  }
}

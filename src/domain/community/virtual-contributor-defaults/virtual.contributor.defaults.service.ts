import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AiPersonaBodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';
import { CreateKnowledgeBaseInput } from '@domain/common/knowledge-base/dto/knowledge.base.dto.create';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { CreateCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create';

@Injectable()
export class VirtualContributorDefaultsService {
  constructor(
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
    knowledgeBaseDefaultCalloutInputs: CreateCalloutInput[] = [],
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

    if (!result.calloutsSetData.calloutsData) {
      result.calloutsSetData.calloutsData = [];
    }

    const providedCallouts = knowledgeBaseData?.calloutsSetData?.calloutsData;
    if (!providedCallouts) {
      if (
        bodyOfKnowledgeType ===
        AiPersonaBodyOfKnowledgeType.ALKEMIO_KNOWLEDGE_BASE
      ) {
        // use the default templates
        result.calloutsSetData.calloutsData = knowledgeBaseDefaultCalloutInputs;
      } else {
        result.calloutsSetData.calloutsData = [];
      }
    }

    return result;
  }
}

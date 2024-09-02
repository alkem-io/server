import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ITemplate } from './template.interface';
import { TemplateService } from './template.service';
import { TemplateType } from '@common/enums/template.type';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';
import { ICallout } from '@domain/collaboration/callout';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { IInnovationFlow } from '@domain/collaboration/innovation-flow/innovation.flow.interface';
import { CreateInnovationFlowInput } from '@domain/collaboration/innovation-flow/dto';
import { CollaborationFactoryService } from '@domain/collaboration/collaboration-factory/collaboration.factory.service';

@Resolver(() => ITemplate)
export class TemplateResolverFields {
  constructor(
    private templateService: TemplateService,
    private collaborationFactoryService: CollaborationFactoryService
  ) {}

  @ResolveField('innovationFlow', () => IInnovationFlow, {
    nullable: true,
    description: 'The Innovation Flow.',
  })
  async innovationFlow(
    @Parent() template: ITemplate
  ): Promise<IInnovationFlow | undefined> {
    if (template.type !== TemplateType.INNOVATION_FLOW) {
      return undefined;
    }
    return this.templateService.getInnovationFlow(template.id);
  }

  @ResolveField('innovationFlow', () => CreateInnovationFlowInput, {
    nullable: true,
    description:
      'Craete the input for a new Innovation Flow based on the supplied Template.',
  })
  async innovationFlowInput(
    @Parent() template: ITemplate
  ): Promise<CreateInnovationFlowInput | undefined> {
    if (template.type !== TemplateType.INNOVATION_FLOW) {
      return undefined;
    }
    const innovationFlow = await this.templateService.getInnovationFlow(
      template.id
    );
    return this.collaborationFactoryService.buildCreateInnovationFlowInputFromInnovationFlow(
      innovationFlow
    );
  }

  @ResolveField('communityGuidelines', () => ICommunityGuidelines, {
    nullable: true,
    description: 'The Community Guidelines for this Template.',
  })
  async communityGuidelines(
    @Parent() template: ITemplate
  ): Promise<ICommunityGuidelines | undefined> {
    if (template.type !== TemplateType.COMMUNITY_GUIDELINES) {
      return undefined;
    }
    return this.templateService.getCommunityGuidelines(template.id);
  }

  @ResolveField('callout', () => ICallout, {
    nullable: true,
    description: 'The Callout for this Template.',
  })
  async callout(@Parent() template: ITemplate): Promise<ICallout | undefined> {
    if (template.type !== TemplateType.CALLOUT) {
      return undefined;
    }
    return this.templateService.getCallout(template.id);
  }

  @ResolveField('whiteboard', () => IWhiteboard, {
    nullable: true,
    description: 'The Whiteboard for this Template.',
  })
  async whiteboard(
    @Parent() template: ITemplate
  ): Promise<IWhiteboard | undefined> {
    if (template.type !== TemplateType.WHITEBOARD) {
      return undefined;
    }
    return this.templateService.getWhiteboard(template.id);
  }
}

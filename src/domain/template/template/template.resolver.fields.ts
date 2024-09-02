import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ITemplate } from './template.interface';
import { TemplateService } from './template.service';
import { TemplateType } from '@common/enums/template.type';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { IInnovationFlow } from '@domain/collaboration/innovation-flow/innovation.flow.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';

@Resolver(() => ITemplate)
export class TemplateResolverFields {
  constructor(private templateService: TemplateService) {}

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

  // @ResolveField('innovationFlowInput', () => CreateInnovationFlowInput, {
  //   nullable: true,
  //   description:
  //     'Craete the input for a new Innovation Flow based on the supplied Template.',
  // })
  // async innovationFlowInput(
  //   @Parent() template: ITemplate
  // ): Promise<CreateInnovationFlowInput | undefined> {
  //   if (template.type !== TemplateType.INNOVATION_FLOW) {
  //     return undefined;
  //   }
  //   const innovationFlow = await this.templateService.getInnovationFlow(
  //     template.id
  //   );
  //   return this.collaborationFactoryService.buildCreateInnovationFlowInputFromInnovationFlow(
  //     innovationFlow
  //   );
  // }

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

  // @ResolveField(
  //   'communityGuidelinesInput',
  //   () => CreateCommunityGuidelinesInput,
  //   {
  //     nullable: true,
  //     description:
  //       'Build the input for a new Community Guidelins using the Community Guidelines for this Template.',
  //   }
  // )
  // async communityGuidelinesInput(
  //   @Parent() template: ITemplate
  // ): Promise<CreateCommunityGuidelinesInput | undefined> {
  //   if (template.type !== TemplateType.COMMUNITY_GUIDELINES) {
  //     return undefined;
  //   }
  //   const communityGuidelines =
  //     await this.templateService.getCommunityGuidelines(template.id);
  //   return this.collaborationFactoryService.buildCreateCommunityGuidelinesInputFromCommunityGuidelines(
  //     communityGuidelines
  //   );
  // }

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

  // @ResolveField('calloutInput', () => CreateCalloutInput, {
  //   nullable: true,
  //   description:
  //     'Build the input for creating a new Callout from this Template.',
  // })
  // async calloutInput(
  //   @Parent() template: ITemplate
  // ): Promise<CreateCalloutInput | undefined> {
  //   if (template.type !== TemplateType.CALLOUT) {
  //     return undefined;
  //   }
  //   const callout = await this.templateService.getCallout(template.id);
  //   return this.collaborationFactoryService.buildCreateCalloutInputFromCallout(
  //     callout
  //   );
  // }

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

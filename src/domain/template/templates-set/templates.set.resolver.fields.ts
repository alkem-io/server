import { TemplateType } from '@common/enums/template.type';
import { Float, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ITemplate } from '../template/template.interface';
import { ITemplatesSet } from './templates.set.interface';
import { TemplatesSetService } from './templates.set.service';

@Resolver(() => ITemplatesSet)
export class TemplatesSetResolverFields {
  constructor(private templatesSetService: TemplatesSetService) {}

  @ResolveField('templates', () => [ITemplate], {
    nullable: false,
    description: 'The Templates in this TemplatesSet.',
  })
  async templates(@Parent() templatesSet: ITemplatesSet): Promise<ITemplate[]> {
    return this.templatesSetService.getTemplates(templatesSet);
  }

  @ResolveField('templatesCount', () => Float, {
    nullable: false,
    description: 'The total number of Templates in this TemplatesSet.',
  })
  async templatesCount(@Parent() templatesSet: ITemplatesSet): Promise<number> {
    return this.templatesSetService.getTemplatesCount(templatesSet.id);
  }

  @ResolveField('calloutTemplates', () => [ITemplate], {
    nullable: false,
    description: 'The CalloutTemplates in this TemplatesSet.',
  })
  async calloutTemplates(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<ITemplate[]> {
    return this.templatesSetService.getTemplatesOfType(
      templatesSet,
      TemplateType.CALLOUT
    );
  }

  @ResolveField('calloutTemplatesCount', () => Float, {
    nullable: false,
    description: 'The total number of CalloutTemplates in this TemplatesSet.',
  })
  calloutTemplatesCount(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<number> {
    return this.templatesSetService.getTemplatesCountForType(
      templatesSet.id,
      TemplateType.CALLOUT
    );
  }

  @ResolveField('spaceTemplates', () => [ITemplate], {
    nullable: false,
    description: 'The Space Templates in this TemplatesSet.',
  })
  async spaceTemplates(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<ITemplate[]> {
    return this.templatesSetService.getTemplatesOfType(
      templatesSet,
      TemplateType.SPACE
    );
  }

  @ResolveField('spaceTemplatesCount', () => Float, {
    nullable: false,
    description: 'The total number of Space Templates in this TemplatesSet.',
  })
  spaceTemplatesCount(@Parent() templatesSet: ITemplatesSet): Promise<number> {
    return this.templatesSetService.getTemplatesCountForType(
      templatesSet.id,
      TemplateType.SPACE
    );
  }

  @ResolveField('communityGuidelinesTemplates', () => [ITemplate], {
    nullable: false,
    description: 'The CommunityGuidelines in this TemplatesSet.',
  })
  async communityGuidelinesTemplates(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<ITemplate[]> {
    return this.templatesSetService.getTemplatesOfType(
      templatesSet,
      TemplateType.COMMUNITY_GUIDELINES
    );
  }

  @ResolveField('communityGuidelinesTemplatesCount', () => Float, {
    nullable: false,
    description:
      'The total number of CommunityGuidelinesTemplates in this TemplatesSet.',
  })
  async communityGuidelinesTemplatesCount(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<number> {
    return this.templatesSetService.getTemplatesCountForType(
      templatesSet.id,
      TemplateType.COMMUNITY_GUIDELINES
    );
  }

  @ResolveField('postTemplates', () => [ITemplate], {
    nullable: false,
    description: 'The Post Templates in this TemplatesSet.',
  })
  async postTemplates(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<ITemplate[]> {
    return this.templatesSetService.getTemplatesOfType(
      templatesSet,
      TemplateType.POST
    );
  }

  @ResolveField('postTemplatesCount', () => Float, {
    nullable: false,
    description: 'The total number of Post Templates in this TemplatesSet.',
  })
  postTemplatesCount(@Parent() templatesSet: ITemplatesSet): Promise<number> {
    return this.templatesSetService.getTemplatesCountForType(
      templatesSet.id,
      TemplateType.POST
    );
  }

  @ResolveField('whiteboardTemplates', () => [ITemplate], {
    nullable: false,
    description: 'The WhiteboardTemplates in this TemplatesSet.',
  })
  async whiteboardTemplates(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<ITemplate[]> {
    return this.templatesSetService.getTemplatesOfType(
      templatesSet,
      TemplateType.WHITEBOARD
    );
  }

  @ResolveField('whiteboardTemplatesCount', () => Float, {
    nullable: false,
    description:
      'The total number of WhiteboardTemplates in this TemplatesSet.',
  })
  async whiteboardTemplatesCount(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<number> {
    return this.templatesSetService.getTemplatesCountForType(
      templatesSet.id,
      TemplateType.WHITEBOARD
    );
  }
}

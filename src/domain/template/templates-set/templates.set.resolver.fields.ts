import { Profiling } from '@common/decorators';
import { Args, Float, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { UUID } from '@domain/common/scalars';
import { ITemplate } from '../template/template.interface';
import { TemplatesSetService } from './templates.set.service';
import { ITemplatesSet } from './templates.set.interface';
import { TemplatesSet } from './templates.set.entity';
import { IWhiteboardTemplate } from '../whiteboard-template/whiteboard.template.interface';
import { ICalloutTemplate } from '../callout-template/callout.template.interface';
import { ICommunityGuidelinesTemplate } from '@domain/template/community-guidelines-template/community.guidelines.template.interface';
import { TemplateType } from '@common/enums/template.type';

@Resolver(() => ITemplatesSet)
export class TemplatesSetResolverFields {
  constructor(private templatesSetService: TemplatesSetService) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('calloutTemplates', () => [ICalloutTemplate], {
    nullable: false,
    description: 'The CalloutTemplates in this TemplatesSet.',
  })
  @Profiling.api
  async calloutTemplates(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<ICalloutTemplate[]> {
    return this.templatesSetService.getCalloutTemplates(templatesSet);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('calloutTemplatesCount', () => Float, {
    nullable: false,
    description: 'The total number of CalloutTemplates in this TemplatesSet.',
  })
  @Profiling.api
  calloutTemplatesCount(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<number> {
    return this.templatesSetService.getCalloutTemplatesCount(templatesSet.id);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('templates', () => [ITemplate], {
    nullable: false,
    description: 'The Templates for Posts in this TemplatesSet.',
  })
  @Profiling.api
  async templates(@Parent() templatesSet: ITemplatesSet): Promise<ITemplate[]> {
    return this.templatesSetService.getPostTemplates(templatesSet);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('templatesCount', () => Float, {
    nullable: false,
    description: 'The total number of PostTemplates in this TemplatesSet.',
  })
  @Profiling.api
  async templatesCount(@Parent() templatesSet: ITemplatesSet): Promise<number> {
    return this.templatesSetService.getTemplatesCount(templatesSet.id);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('template', () => ITemplate, {
    nullable: true,
    description: 'A single Post Template',
  })
  @Profiling.api
  public template(
    @Parent() templatesSet: TemplatesSet,
    @Args({
      name: 'ID',
      nullable: false,
      type: () => UUID,
      description: 'The ID of the Template',
    })
    ID: string
  ): Promise<ITemplate> {
    return this.templatesSetService.getPostTemplate(ID, templatesSet.id);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('whiteboardTemplates', () => [IWhiteboardTemplate], {
    nullable: false,
    description: 'The WhiteboardTemplates in this TemplatesSet.',
  })
  @Profiling.api
  async whiteboardTemplates(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<IWhiteboardTemplate[]> {
    return this.templatesSetService.getWhiteboardTemplates(templatesSet);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('whiteboardTemplatesCount', () => Float, {
    nullable: false,
    description:
      'The total number of WhiteboardTemplates in this TemplatesSet.',
  })
  @Profiling.api
  async whiteboardTemplatesCount(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<number> {
    return this.templatesSetService.getWhiteboardTemplatesCount(
      templatesSet.id
    );
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('whiteboardTemplate', () => IWhiteboardTemplate, {
    nullable: true,
    description: 'A single WhiteboardTemplate',
  })
  @Profiling.api
  public whiteboardTemplate(
    @Parent() templatesSet: TemplatesSet,
    @Args({
      name: 'ID',
      nullable: false,
      type: () => UUID,
      description: 'The ID of the Template',
    })
    ID: string
  ): Promise<IWhiteboardTemplate> {
    return this.templatesSetService.getWhiteboardTemplate(ID, templatesSet.id);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('innovationFlowTemplates', () => [ITemplate], {
    nullable: false,
    description: 'The InnovationFlowTemplates in this TemplatesSet.',
  })
  @Profiling.api
  async innovationFlowTemplates(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<ITemplate[]> {
    return this.templatesSetService.getInnovationFlowTemplates(templatesSet);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('innovationFlowTemplatesCount', () => Float, {
    nullable: false,
    description:
      'The total number of InnovationFlowTemplates in this TemplatesSet.',
  })
  @Profiling.api
  async innovationFlowTemplatesCount(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<number> {
    return this.templatesSetService.getTemplatesCountForType(
      templatesSet.id,
      TemplateType.INNOVATION_FLOW
    );
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(
    'communityGuidelinesTemplate',
    () => ICommunityGuidelinesTemplate,
    {
      nullable: true,
      description: 'A single CommunityGuidelinesTemplate',
    }
  )
  @Profiling.api
  public communityGuidelinesTemplate(
    @Parent() templatesSet: TemplatesSet,
    @Args({
      name: 'ID',
      nullable: false,
      type: () => UUID,
      description: 'The ID of the Template',
    })
    ID: string
  ): Promise<ICommunityGuidelinesTemplate> {
    return this.templatesSetService.getCommunityGuidelinesTemplate(
      ID,
      templatesSet.id
    );
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(
    'communityGuidelinesTemplates',
    () => [ICommunityGuidelinesTemplate],
    {
      nullable: false,
      description: 'The CommunityGuidelines in this TemplatesSet.',
    }
  )
  @Profiling.api
  async communityGuidelinesTemplates(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<ICommunityGuidelinesTemplate[]> {
    return this.templatesSetService.getCommunityGuidelinesTemplates(
      templatesSet
    );
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('communityGuidelinesTemplatesCount', () => Float, {
    nullable: false,
    description:
      'The total number of CommunityGuidelinesTemplates in this TemplatesSet.',
  })
  @Profiling.api
  async communityGuidelinesTemplatesCount(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<number> {
    return this.templatesSetService.getCommunityGuidelinesTemplatesCount(
      templatesSet.id
    );
  }
}

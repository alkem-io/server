import { Profiling } from '@common/decorators';
import { Args, Float, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { UUID } from '@domain/common/scalars';
import { IPostTemplate } from '../post-template/post.template.interface';
import { TemplatesSetService } from './templates.set.service';
import { ITemplatesSet } from './templates.set.interface';
import { TemplatesSet } from './templates.set.entity';
import { IWhiteboardTemplate } from '../whiteboard-template/whiteboard.template.interface';
import { IInnovationFlowTemplate } from '../innovation-flow-template/innovation.flow.template.interface';
import { ICalloutTemplate } from '../callout-template/callout.template.interface';
import { ICommunityGuidelinesTemplate } from '@domain/template/community-guidelines-template/community.guidelines.template.interface';

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
  async calloutTemplatesCount(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<number> {
    return this.templatesSetService.getCalloutTemplatesCount(templatesSet.id);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('postTemplates', () => [IPostTemplate], {
    nullable: false,
    description: 'The PostTemplates in this TemplatesSet.',
  })
  @Profiling.api
  async postTemplates(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<IPostTemplate[]> {
    return this.templatesSetService.getPostTemplates(templatesSet);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('postTemplatesCount', () => Float, {
    nullable: false,
    description: 'The total number of PostTemplates in this TemplatesSet.',
  })
  @Profiling.api
  async postTemplatesCount(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<number> {
    return this.templatesSetService.getPostTemplatesCount(templatesSet.id);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('postTemplate', () => IPostTemplate, {
    nullable: true,
    description: 'A single PostTemplate',
  })
  @Profiling.api
  public postTemplate(
    @Parent() templatesSet: TemplatesSet,
    @Args({
      name: 'ID',
      nullable: false,
      type: () => UUID,
      description: 'The ID of the Template',
    })
    ID: string
  ): Promise<IPostTemplate> {
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
  @ResolveField('innovationFlowTemplates', () => [IInnovationFlowTemplate], {
    nullable: false,
    description: 'The InnovationFlowTemplates in this TemplatesSet.',
  })
  @Profiling.api
  async innovationFlowTemplates(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<IInnovationFlowTemplate[]> {
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
    return this.templatesSetService.getInnovationFlowTemplatesCount(
      templatesSet.id
    );
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('innovationFlowTemplate', () => IInnovationFlowTemplate, {
    nullable: true,
    description: 'A single InnovationFlowTemplate',
  })
  @Profiling.api
  public innovationFlowTemplate(
    @Parent() templatesSet: TemplatesSet,
    @Args({
      name: 'ID',
      nullable: false,
      type: () => UUID,
      description: 'The ID of the Template',
    })
    ID: string
  ): Promise<IInnovationFlowTemplate> {
    return this.templatesSetService.getInnovationFlowTemplate(
      ID,
      templatesSet.id
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

import { Profiling } from '@common/decorators';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { UUID } from '@domain/common/scalars';
import { IAspectTemplate } from '../aspect-template/aspect.template.interface';
import { TemplatesSetService } from './templates.set.service';
import { ITemplatesSet } from './templates.set.interface';
import { ICanvasTemplate } from '../canvas-template/canvas.template.interface';
import { ILifecycleTemplate } from '../lifecycle-template/lifecycle.template.interface';
import { ITemplatesSetPolicy } from '../templates-set-policy/templates.set.policy.interface';

@Resolver(() => ITemplatesSet)
export class TemplatesSetResolverFields {
  constructor(private templatesSetService: TemplatesSetService) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('aspectTemplates', () => [IAspectTemplate], {
    nullable: false,
    description: 'The AspectTemplates in this TemplatesSet.',
  })
  @Profiling.api
  async aspectTemplates(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<IAspectTemplate[]> {
    return await this.templatesSetService.getAspectTemplates(templatesSet);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('aspectTemplate', () => IAspectTemplate, {
    nullable: true,
    description: 'A single AspectTemplate',
  })
  @Profiling.api
  public aspectTemplate(
    @Args({
      name: 'ID',
      nullable: false,
      type: () => UUID,
      description: 'The ID of the Template',
    })
    ID: string
  ): Promise<IAspectTemplate> {
    return this.templatesSetService.getAspectTemplate(ID);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('canvasTemplates', () => [ICanvasTemplate], {
    nullable: false,
    description: 'The CanvasTemplates in this TemplatesSet.',
  })
  @Profiling.api
  async canvasTemplates(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<ICanvasTemplate[]> {
    return await this.templatesSetService.getCanvasTemplates(templatesSet);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('canvasTemplate', () => ICanvasTemplate, {
    nullable: true,
    description: 'A single AspectTemplate',
  })
  @Profiling.api
  public canvasTemplate(
    @Args({
      name: 'ID',
      nullable: false,
      type: () => UUID,
      description: 'The ID of the Template',
    })
    ID: string
  ): Promise<ICanvasTemplate> {
    return this.templatesSetService.getCanvasTemplate(ID);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('lifecycleTemplates', () => [ILifecycleTemplate], {
    nullable: false,
    description: 'The LifecycleTemplates in this TemplatesSet.',
  })
  @Profiling.api
  async lifecycleTemplates(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<ILifecycleTemplate[]> {
    return await this.templatesSetService.getInnovationFlowTemplates(
      templatesSet
    );
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('lifecycleTemplate', () => ILifecycleTemplate, {
    nullable: true,
    description: 'A single AspectTemplate',
  })
  @Profiling.api
  public lifecycleTemplate(
    @Args({
      name: 'ID',
      nullable: false,
      type: () => UUID,
      description: 'The ID of the Template',
    })
    ID: string
  ): Promise<ILifecycleTemplate> {
    return this.templatesSetService.getLifecycleTemplate(ID);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('policy', () => ITemplatesSetPolicy, {
    nullable: true,
    description: 'The policy for this TemplatesSet.',
  })
  @Profiling.api
  async policy(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<ITemplatesSetPolicy> {
    return this.templatesSetService.getPolicy(templatesSet);
  }
}

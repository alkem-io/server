import { Profiling } from '@common/decorators';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { IAspectTemplate } from '../aspect-template/aspect.template.interface';
import { TemplatesSetService } from './templates.set.service';
import { ITemplatesSet } from './templates.set.interface';
import { ICanvasTemplate } from '../canvas-template/canvas.template.interface';

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
}

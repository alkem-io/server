import { Profiling } from '@common/decorators';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { IAspectTemplate } from '../aspect-template/aspect.template.interface';
import { TemplatesSetService } from './templates.set.service';
import { ITemplatesSet } from './templates.set.interface';

@Resolver(() => ITemplatesSet)
export class TemplatesSetResolverFields {
  constructor(private templatesSetService: TemplatesSetService) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('aspectTemplates', () => [IAspectTemplate], {
    nullable: true,
    description: 'The AspectTemplates in this TemplatesSet.',
  })
  @Profiling.api
  async aspectTemplates(
    @Parent() templatesSet: ITemplatesSet
  ): Promise<IAspectTemplate[]> {
    return await this.templatesSetService.getAspectTemplates(templatesSet);
  }
}

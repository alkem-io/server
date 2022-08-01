import { Profiling } from '@common/decorators';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { ITemplateInfo } from './template.info.interface';
import { TemplateInfoService } from './template.info.service';
import { IVisual } from '@domain/common/visual/visual.interface';

@Resolver(() => ITemplateInfo)
export class TemplateInfoResolverFields {
  constructor(private templateInfoService: TemplateInfoService) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('visual', () => IVisual, {
    nullable: false,
    description: 'The Visual for this TemplateInfo.',
  })
  @Profiling.api
  async visual(@Parent() templateInfo: ITemplateInfo): Promise<IVisual> {
    return await this.templateInfoService.getVisual(templateInfo);
  }
}

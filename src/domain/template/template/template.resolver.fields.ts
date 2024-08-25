import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IInnovationFlowState } from '@domain/collaboration/innovation-flow-states/innovation.flow.state.interface';
import { ITemplate } from './template.interface';
import { TemplateService } from './template.service';
import { TemplateType } from '@common/enums/template.type';

@Resolver(() => ITemplate)
export class TemplateResolverFields {
  constructor(private templateService: TemplateService) {}

  @ResolveField('innovationFlowStates', () => [IInnovationFlowState], {
    nullable: true,
    description: 'The set of States in use for an Innovation Flow.',
  })
  innovationFlowStates(
    @Parent() template: ITemplate
  ): IInnovationFlowState[] | undefined {
    if (template.type !== TemplateType.INNOVATION_FLOW) {
      return undefined;
    }
    return this.templateService.getInnovationFlowStates(template);
  }
}

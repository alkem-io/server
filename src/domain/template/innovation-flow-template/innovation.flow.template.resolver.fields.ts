import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IInnovationFlowTemplate } from './innovation.flow.template.interface';
import { InnovationFlowTemplateService } from './innovation.flow.template.service';
import { IInnovationFlowState } from '@domain/challenge/innovation-flow-states/innovation.flow.state.interface';

@Resolver(() => IInnovationFlowTemplate)
export class InnovationFlowTemplateResolverFields {
  constructor(
    private innovationFlowTemplateService: InnovationFlowTemplateService
  ) {}

  @ResolveField('states', () => [IInnovationFlowState], {
    nullable: false,
    description: 'The set of States in use in this Flow.',
  })
  states(
    @Parent() flowTemplate: IInnovationFlowTemplate
  ): IInnovationFlowState[] {
    return this.innovationFlowTemplateService.getStates(flowTemplate);
  }
}

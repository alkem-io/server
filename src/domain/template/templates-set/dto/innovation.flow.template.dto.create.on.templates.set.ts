import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreateInnovationFlowTemplateInput } from '@domain/template/innovation-flow-template/dto/innovation.flow.template.dto.create';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateInnovationFlowTemplateOnTemplatesSetInput extends CreateInnovationFlowTemplateInput {
  @Field(() => UUID, { nullable: false })
  templatesSetID!: string;
}

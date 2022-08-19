import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreateInnovationFlowTemplateInput } from '@domain/template/lifecycle-template/dto/lifecycle.template.dto.create';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateLifecycleTemplateOnTemplatesSetInput extends CreateInnovationFlowTemplateInput {
  @Field(() => UUID, { nullable: false })
  templatesSetID!: string;
}

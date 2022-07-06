import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreateLifecycleTemplateInput } from '@domain/template/lifecycle-template/dto/lifecycle.template.dto.create';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateLifecycleTemplateOnTemplatesSetInput extends CreateLifecycleTemplateInput {
  @Field(() => UUID, { nullable: false })
  templatesSetID!: string;
}

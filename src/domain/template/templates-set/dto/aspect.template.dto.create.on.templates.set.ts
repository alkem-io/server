import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreateAspectTemplateInput } from '@domain/template/aspect-template/dto/aspect.template.dto.create';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateAspectTemplateOnTemplatesSetInput extends CreateAspectTemplateInput {
  @Field(() => UUID, { nullable: false })
  templatesSetID!: string;
}

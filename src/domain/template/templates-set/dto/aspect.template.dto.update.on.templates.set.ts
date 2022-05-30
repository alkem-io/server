import { UUID } from '@domain/common/scalars/scalar.uuid';
import { UpdateAspectTemplateInput } from '@domain/template/aspect-template/dto/aspect.template.dto.update';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateAspectTemplateOnTemplatesSetInput extends UpdateAspectTemplateInput {
  @Field(() => UUID, { nullable: false })
  templatesSetID!: string;
}

import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreateTemplateInput } from '@domain/template/template/dto/template.dto.create';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateTemplateOnTemplatesSetInput extends CreateTemplateInput {
  @Field(() => UUID, { nullable: false })
  templatesSetID!: string;
}

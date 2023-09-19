import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreateCalloutTemplateInput } from '@domain/template/callout-template/dto/callout.template.dto.create';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateCalloutTemplateOnTemplatesSetInput extends CreateCalloutTemplateInput {
  @Field(() => UUID, { nullable: false })
  templatesSetID!: string;
}

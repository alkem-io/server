import { InputType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class UpdateTemplateDefaultTemplateInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The identifier for the TemplateDefault to be updated.',
  })
  templateDefaultID!: string;

  @Field(() => UUID, {
    nullable: false,
    description: 'The ID for the Template to use.',
  })
  templateID!: string;
}

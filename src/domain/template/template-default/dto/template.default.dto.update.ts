import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

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

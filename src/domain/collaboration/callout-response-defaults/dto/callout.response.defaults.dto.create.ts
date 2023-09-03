import { InputType, Field } from '@nestjs/graphql';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
@InputType()
export class CreateCalloutResponseDefaultsInput {
  @Field(() => Markdown, {
    nullable: true,
    description: 'The default description to use for new contributions.',
  })
  description?: string;
}

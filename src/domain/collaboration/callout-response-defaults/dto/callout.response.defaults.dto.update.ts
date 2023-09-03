import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity/base.alkemio.dto.update';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateCalloutResponseDefaultsInput extends UpdateBaseAlkemioInput {
  @Field(() => Markdown, {
    nullable: true,
    description: 'The default description to use for new contributions.',
  })
  description?: string;
}

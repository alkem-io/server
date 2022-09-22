import { CalloutVisibility } from '@common/enums/callout.visibility';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateCalloutVisibilityInput {
  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Callout whose visibility is to be updated.',
  })
  calloutID!: string;

  @Field(() => CalloutVisibility, {
    nullable: false,
    description: 'Visibility of the Callout.',
  })
  visibility!: CalloutVisibility;
}

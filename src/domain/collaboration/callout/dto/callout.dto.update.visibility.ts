import { UUID_LENGTH } from '@common/constants';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class UpdateCalloutVisibilityInput {
  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Callout whose visibility is to be updated.',
  })
  @MaxLength(UUID_LENGTH)
  calloutID!: string;

  @Field(() => CalloutVisibility, {
    nullable: false,
    description: 'Visibility of the Callout.',
  })
  visibility!: CalloutVisibility;

  @Field(() => Boolean, {
    nullable: true,
    defaultValue: true,
    description: 'Send a notification on publishing.',
  })
  sendNotification!: boolean;
}

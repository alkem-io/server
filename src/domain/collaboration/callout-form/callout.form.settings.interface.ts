import { CalloutFormResponseMode } from '@common/enums/callout.form.response.mode';
import { CalloutFormResponseVisibility } from '@common/enums/callout.form.response.visibility';
import { CalloutFormState } from '@common/enums/callout.form.state';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CalloutFormSettings')
export abstract class ICalloutFormSettings {
  @Field(() => CalloutFormResponseVisibility, {
    nullable: false,
    description: 'Who can read all the responses. Defaults to ADMINS.',
  })
  visibility!: CalloutFormResponseVisibility;

  @Field(() => CalloutFormResponseMode, {
    nullable: false,
    description:
      'Whether a member can submit one or several responses. Defaults to SINGLE.',
  })
  responseMode!: CalloutFormResponseMode;

  @Field(() => CalloutFormState, {
    nullable: false,
    description: 'Whether the Form accepts new responses. Defaults to OPEN.',
  })
  state!: CalloutFormState;
}

import { InputType, Field } from '@nestjs/graphql';
import { CalloutResponseType } from '@common/enums/callout.response.type';
import { CalloutState } from '@common/enums/callout.state';
@InputType()
export class CreateCalloutResponsePolicyInput {
  @Field(() => [CalloutResponseType], {
    nullable: true,
    description: 'The allowed response types for this callout.',
  })
  allowedResponseTypes?: string[];

  @Field(() => CalloutState, {
    nullable: true,
    description: 'State of the callout.',
  })
  state!: CalloutState;
}

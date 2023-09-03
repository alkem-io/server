import { InputType, Field } from '@nestjs/graphql';
import { CalloutResponseType } from '@common/enums/callout.response.type';
@InputType()
export class CreateCalloutResponsePolicyInput {
  @Field(() => [CalloutResponseType], {
    nullable: true,
    description: 'The allowed response types for this callout.',
  })
  allowedResponseTypes?: string[];

  @Field(() => Boolean, {
    nullable: true,
    description: 'Are new responses allowed?',
  })
  allowNewResponses?: boolean;
}

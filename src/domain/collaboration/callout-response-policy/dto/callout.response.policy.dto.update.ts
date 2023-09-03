import { CalloutResponseType } from '@common/enums/callout.response.type';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity/base.alkemio.dto.update';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateCalloutResponsePolicyInput extends UpdateBaseAlkemioInput {
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

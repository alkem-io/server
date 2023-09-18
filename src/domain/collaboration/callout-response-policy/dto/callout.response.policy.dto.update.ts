import { CalloutResponseType } from '@common/enums/callout.response.type';
import { CalloutState } from '@common/enums/callout.state';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity/base.alkemio.dto.update';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateCalloutResponsePolicyInput extends UpdateBaseAlkemioInput {
  @Field(() => [CalloutResponseType], {
    nullable: true,
    description: 'The allowed response types for this callout.',
  })
  allowedResponseTypes?: CalloutResponseType[];

  @Field(() => CalloutState, {
    nullable: true,
    description: 'State of the callout.',
  })
  state!: CalloutState;
}

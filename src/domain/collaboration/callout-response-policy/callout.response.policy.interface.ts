import { CalloutResponseType } from '@common/enums/callout.response.type';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CalloutResponsePolicy')
export abstract class ICalloutResponsePolicy extends IBaseAlkemio {
  @Field(() => [CalloutResponseType], {
    nullable: false,
    description: 'The allowed response types for this callout.',
  })
  allowedResponseTypes!: string[];

  @Field(() => Boolean, {
    nullable: false,
    description: 'Are new responses allowed?',
  })
  allowNewResponses!: boolean;
}

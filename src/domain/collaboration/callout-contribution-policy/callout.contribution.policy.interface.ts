import { Field, ObjectType } from '@nestjs/graphql';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { CalloutState } from '@common/enums/callout.state';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';

@ObjectType('CalloutContributionPolicy')
export abstract class ICalloutContributionPolicy extends IBaseAlkemio {
  @Field(() => [CalloutContributionType], {
    nullable: false,
    description: 'The allowed contribution types for this callout.',
  })
  allowedContributionTypes!: CalloutContributionType[];

  @Field(() => CalloutState, {
    description: 'State of the Callout.',
  })
  state!: CalloutState;
}

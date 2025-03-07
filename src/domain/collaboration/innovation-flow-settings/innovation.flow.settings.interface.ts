import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('InnovationFlowSettings')
export abstract class IInnovationFlowSettings {
  @Field(() => Number, {
    nullable: false,
    description: 'The minimum number of allowed states',
  })
  minimumNumberOfStates!: number;

  @Field(() => Number, {
    nullable: false,
    description: 'The maximum number of allowed states.',
  })
  maximumNumberOfStates!: number;
}

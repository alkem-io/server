import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('InnovationFlowStateSettings')
export abstract class IInnovationFlowStateSettings {
  @Field(() => Boolean, {
    nullable: false,
    description: 'The flag to set.',
  })
  someFlag!: boolean;
}

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('InnovationFlowStateSettings')
export abstract class IInnovationFlowStateSettings {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Whether new callouts can be added to this State.',
  })
  allowNewCallouts!: boolean;
}

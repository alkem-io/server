import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { LifecycleDefinitionScalar } from '@domain/common/scalars/scalar.lifecycle.definition';

@InputType()
export class UpdateChallengeLifecycleInput {
  @Field(() => UUID, {
    description: 'ID of the Challenge',
  })
  challengeID!: string;

  @Field(() => LifecycleDefinitionScalar, {
    nullable: false,
    description: 'The Lifecycle Definition to use for this Challenge.',
  })
  lifecycleDefinition!: string;
}

import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { CreateChallengeInput } from './challenge.dto.create';

@InputType()
export class CreateChallengeOnChallengeInput extends CreateChallengeInput {
  @Field(() => UUID, { nullable: false })
  challengeID!: string;
}

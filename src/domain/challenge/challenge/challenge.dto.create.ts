import { Field, InputType } from '@nestjs/graphql';
import { CreateBaseChallengeInput } from '../base-challenge';

@InputType()
export class CreateChallengeInput extends CreateBaseChallengeInput {
  @Field({ nullable: false })
  parentID!: string;
}

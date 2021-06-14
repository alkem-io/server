import { UUID_NAMEID } from '@domain/common/scalars/scalar.uuid.nameid';
import { Field, InputType } from '@nestjs/graphql';
import { CreateBaseChallengeInput } from '../base-challenge';

@InputType()
export class CreateChallengeInput extends CreateBaseChallengeInput {
  @Field(() => UUID_NAMEID, { nullable: false })
  parentID!: string;
}

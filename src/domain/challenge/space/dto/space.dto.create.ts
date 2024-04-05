import { Field, InputType } from '@nestjs/graphql';
import { CreateBaseChallengeInput } from '@domain/challenge/base-challenge/dto/base.challenge.dto.create';
import { NameID } from '@domain/common/scalars/scalar.nameid';

@InputType()
export class CreateSpaceInput extends CreateBaseChallengeInput {
  // Override
  @Field(() => NameID, {
    nullable: false,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID!: string;
}

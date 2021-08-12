import { UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { CreateChallengeInput } from './challenge.dto.create';

@InputType()
export class CreateChallengeInEcoverseInput extends CreateChallengeInput {
  @Field(() => UUID_NAMEID, { nullable: false })
  ecoverseID!: string;
}

import { UUID } from '@domain/common/scalars/scalar.uuid';
import { InputType, Field } from '@nestjs/graphql';
import { MID_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';
import { MaxLength } from 'class-validator';

@InputType()
export class CreateActorGroupInput {
  @Field(() => UUID, { nullable: false })
  ecosystemModelID!: string;

  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field({ nullable: true })
  @MaxLength(MID_TEXT_LENGTH)
  description?: string;
}

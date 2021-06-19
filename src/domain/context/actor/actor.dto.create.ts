import { UUID } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';
import { MID_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreateActorInput {
  @Field(() => UUID, { nullable: false })
  actorGroupID!: string;

  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  description?: string;

  @Field({ nullable: true })
  @MaxLength(MID_TEXT_LENGTH)
  value?: string;

  @Field({ nullable: true })
  @MaxLength(MID_TEXT_LENGTH)
  impact?: string;
}

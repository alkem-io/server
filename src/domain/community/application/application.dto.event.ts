import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class ApplicationEventInput {
  @Field(() => UUID, { nullable: false })
  ID!: string;

  @Field({ nullable: false })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  eventName!: string;
}

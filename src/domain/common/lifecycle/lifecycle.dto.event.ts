import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';

@InputType()
export class LifecycleEventInput {
  @Field({ nullable: false })
  ID!: number;

  @Field({ nullable: false })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  eventName!: string;
}

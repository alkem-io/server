import { InputType, Field } from '@nestjs/graphql';
import { MID_TEXT_LENGTH, VERY_LONG_TEXT_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity';

@InputType()
export class CreateAspectInput extends CreateNameableInput {
  @Field({ nullable: false })
  @MaxLength(MID_TEXT_LENGTH)
  type!: string;

  @Field({ nullable: false })
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  description!: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}

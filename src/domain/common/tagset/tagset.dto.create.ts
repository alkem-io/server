import { Field, InputType } from '@nestjs/graphql';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';
import { UUID } from '../scalars/scalar.uuid';

@InputType()
export class CreateTagsetInput {
  @Field(() => UUID, { nullable: true })
  parentID?: string;

  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}

import { InputType, Field } from '@nestjs/graphql';
import {
  LONG_TEXT_LENGTH,
  MID_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
} from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';
import { UUID } from '../scalars/scalar.uuid';
@InputType()
export class CreateReferenceInput {
  @Field(() => UUID, { nullable: true })
  @IsOptional()
  parentID?: string;

  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  //@IsUrl()
  @MaxLength(MID_TEXT_LENGTH)
  uri?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;
}

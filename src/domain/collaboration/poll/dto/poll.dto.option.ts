import { MID_TEXT_LENGTH } from '@common/constants';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import {
  ArrayMinSize,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

@InputType('AddPollOptionInput')
export class AddPollOptionInput {
  @Field(() => UUID, { nullable: false })
  @IsUUID()
  pollID!: string;

  @Field(() => String, { nullable: false })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MID_TEXT_LENGTH)
  text!: string;
}

@InputType('UpdatePollOptionInput')
export class UpdatePollOptionInput {
  @Field(() => UUID, { nullable: false })
  @IsUUID()
  pollID!: string;

  @Field(() => UUID, { nullable: false })
  @IsUUID()
  optionID!: string;

  @Field(() => String, { nullable: false })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MID_TEXT_LENGTH)
  text!: string;
}

@InputType('RemovePollOptionInput')
export class RemovePollOptionInput {
  @Field(() => UUID, { nullable: false })
  @IsUUID()
  pollID!: string;

  @Field(() => UUID, { nullable: false })
  @IsUUID()
  optionID!: string;
}

@InputType('ReorderPollOptionsInput')
export class ReorderPollOptionsInput {
  @Field(() => UUID, { nullable: false })
  @IsUUID()
  pollID!: string;

  @Field(() => [UUID], { nullable: false })
  @IsUUID('all', { each: true })
  @ArrayMinSize(1)
  optionIDs!: string[];
}

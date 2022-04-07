import { NameID } from '@domain/common/scalars/scalar.nameid';
import { InputType, Field } from '@nestjs/graphql';
import {
  LONG_TEXT_LENGTH,
  MID_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
} from '@src/common/constants';
import { IsOptional, MaxLength, MinLength } from 'class-validator';

@InputType()
export class CreateAspectInput {
  @Field(() => NameID, {
    nullable: true,
    description:
      'A readable identifier, unique within the containing scope. If not provided generate based on the displayName',
  })
  nameID!: string;

  @Field({ nullable: false, description: 'The display name for the entity.' })
  @MinLength(3)
  @MaxLength(SMALL_TEXT_LENGTH)
  displayName!: string;

  @Field({ nullable: false })
  @MaxLength(MID_TEXT_LENGTH)
  type!: string;

  @Field({ nullable: false })
  @MaxLength(LONG_TEXT_LENGTH)
  defaultDescription!: string;

  @Field({ nullable: false })
  @MaxLength(LONG_TEXT_LENGTH)
  typeDescription!: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}

import { InputType, Field } from '@nestjs/graphql';
import {
  MID_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
  VERY_LONG_TEXT_LENGTH,
} from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';
import { NameID } from '@domain/common/scalars';
import { MinLength } from 'class-validator';
import { Markdown } from '@domain/common/scalars/scalar.markdown';

@InputType()
export class CreateAspectInput {
  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID?: string;

  @Field({ nullable: false, description: 'The display name for the entity.' })
  @MinLength(3)
  @MaxLength(SMALL_TEXT_LENGTH)
  displayName!: string;

  @Field({ nullable: false })
  @MaxLength(MID_TEXT_LENGTH)
  type!: string;

  @Field(() => Markdown, { nullable: false })
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  description!: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}

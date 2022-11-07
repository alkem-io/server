import { InputType, Field } from '@nestjs/graphql';
import { MID_TEXT_LENGTH, VERY_LONG_TEXT_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/nameable.dto.create';
import { NameID } from '@domain/common/scalars/scalar.nameid';

@InputType()
export class CreateAspectInput extends CreateNameableInput {
  @Field({ nullable: false })
  @MaxLength(MID_TEXT_LENGTH)
  type!: string;

  @Field(() => Markdown, { nullable: false })
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  description!: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  visualUri?: string;

  // Override
  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID!: string;
}

import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/nameable.dto.update';
import { UpdateReferenceInput } from '@domain/common/reference/reference.dto.update';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { InputType, Field } from '@nestjs/graphql';
import { VERY_LONG_TEXT_LENGTH, MID_TEXT_LENGTH } from '@src/common/constants';
import { Type } from 'class-transformer';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';

@InputType()
export class UpdateAspectInput extends UpdateNameableInput {
  @Field(() => Markdown, { nullable: true })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  type?: string;

  @Field(() => [String], {
    nullable: true,
    description: 'Update the tags on the Aspect.',
  })
  @IsOptional()
  tags?: string[];

  @Field(() => [UpdateReferenceInput], {
    nullable: true,
    description: 'Update the set of References for the Aspect.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateReferenceInput)
  references?: UpdateReferenceInput[];
}

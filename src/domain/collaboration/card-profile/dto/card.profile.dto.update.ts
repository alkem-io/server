import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { LONG_TEXT_LENGTH } from '@src/common/constants';
import { UpdateReferenceInput } from '@domain/common/reference';
import { Type } from 'class-transformer';

@InputType()
export class UpdateCardProfileInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;

  @Field(() => [UpdateReferenceInput], { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateReferenceInput)
  references?: UpdateReferenceInput[];

  @Field(() => [String], {
    nullable: true,
    description: 'Update the tags on the Aspect.',
  })
  @IsOptional()
  tags?: string[];
}

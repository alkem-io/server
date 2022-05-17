import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/nameable.dto.update';
import { UpdateReferenceInput } from '@domain/common/reference/reference.dto.update';
import { InputType, Field } from '@nestjs/graphql';
import { VERY_LONG_TEXT_LENGTH, MID_TEXT_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class UpdateAspectInput extends UpdateNameableInput {
  @Field({ nullable: true })
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  description?: string;

  @Field({ nullable: true })
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
  references?: UpdateReferenceInput[];
}

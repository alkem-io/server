import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/nameable.dto.update';
import { InputType, Field } from '@nestjs/graphql';
import { LONG_TEXT_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class UpdateAspectInput extends UpdateNameableInput {
  @Field({ nullable: true })
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;

  @Field(() => [String], {
    nullable: true,
    description: 'Update the tags on the Aspect.',
  })
  @IsOptional()
  tags?: string[];
}

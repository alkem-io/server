import { SMALL_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength, MinLength } from 'class-validator';

// Shared across the Classification Template create/update inputs and the
// two entry inputs that carry a value set inline (CreateClassificationEntryInput,
// UpdateClassificationEntryInput) — one input, one derivation rule (FR-002c),
// consumed identically on every write path.
@InputType()
export class CreateClassificationValueInput {
  @Field(() => String, {
    nullable: true,
    description:
      'Optional explicit stable id. Omitted -> slugified from `label` once, at authoring time.',
  })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  id?: string;

  @Field(() => String, { nullable: false })
  @MinLength(1)
  @MaxLength(SMALL_TEXT_LENGTH)
  label!: string;
}

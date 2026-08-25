import { SMALL_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

// Step A — keyed on spaceID (D1): this IS the host-scope enforcement, since
// resolving spaceID through SpaceLookupService.getSpaceOrFail fails for
// anything that isn't a Space.
@InputType()
export class AddClassificationEntryFromTemplateInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Space to add the Classification to.',
  })
  spaceID!: string;

  @Field(() => UUID, {
    nullable: false,
    description: 'The Classification Template to copy the vocabulary from.',
  })
  templateID!: string;

  @Field(() => String, {
    nullable: true,
    description:
      "Override for the entry's display label. Defaults to the source template's display name.",
  })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  displayLabel?: string;
}

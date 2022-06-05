import { SMALL_TEXT_LENGTH } from '@common/constants';
import { InputType, Field } from '@nestjs/graphql';
import { MinLength, MaxLength } from 'class-validator';
import { NameID } from '@domain/common/scalars';

@InputType()
export class CreateNameableInput {
  @Field(() => NameID, {
    nullable: false,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID!: string;

  @Field({ nullable: false, description: 'The display name for the entity.' })
  @MinLength(3)
  @MaxLength(SMALL_TEXT_LENGTH)
  displayName!: string;
}

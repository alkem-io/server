import { SMALL_TEXT_LENGTH } from '@common/constants';
import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { NameID } from '@domain/common/scalars';

@InputType()
export class CreateNameableInput {
  @Field(() => NameID, {
    nullable: false,
    description: 'A display identifier, unique within the containing scope.',
  })
  nameID!: string;

  @Field({ nullable: false, description: 'The name for the entity.' })
  @MaxLength(SMALL_TEXT_LENGTH)
  displayName!: string;
}

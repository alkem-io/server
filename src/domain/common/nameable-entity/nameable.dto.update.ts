import { SMALL_TEXT_LENGTH } from '@common/constants';
import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { NameID, UUID_NAMEID } from '@domain/common/scalars';

@InputType()
export class UpdateNameableInput {
  @Field({ nullable: true, description: 'The display name for this entity.' })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  displayName?: string;

  @Field(() => NameID, {
    nullable: true,
    description:
      'A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client.',
  })
  nameID?: string;

  // Does not extend base entity update DTO as need to be able to specify also a NameID as part of the update
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description: 'The ID of the entity to be updated.',
  })
  ID!: string;
}

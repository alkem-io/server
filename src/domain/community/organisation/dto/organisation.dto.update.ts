import { Field, InputType } from '@nestjs/graphql';
import { UpdateProfileInput } from '@domain/community/profile';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity';
import { UUID_NAMEID } from '@domain/common/scalars';
@InputType()
export class UpdateOrganisationInput extends UpdateNameableInput {
  @Field(() => UpdateProfileInput, { nullable: true })
  profileData?: UpdateProfileInput;

  // Override the type of entry accepted
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description: 'The ID or NameID of the Organisation to update.',
  })
  ID!: string;
}

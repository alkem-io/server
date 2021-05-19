import { Field, InputType } from '@nestjs/graphql';
import { CreateProfileInput } from '@domain/community/profile';
import { CreateIdentifiableInput } from '@domain/common/identifiable-entity';

@InputType()
export class CreateOrganisationInput extends CreateIdentifiableInput {
  @Field(() => CreateProfileInput, { nullable: true })
  profileData?: CreateProfileInput;
}

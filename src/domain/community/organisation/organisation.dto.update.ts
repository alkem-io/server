import { Field, InputType } from '@nestjs/graphql';
import { UpdateProfileInput } from '@domain/community/profile';
import { UpdateIdentifiableInput } from '@domain/common/identifiable-entity';
@InputType()
export class UpdateOrganisationInput extends UpdateIdentifiableInput {
  @Field(() => UpdateProfileInput, { nullable: true })
  profileData?: UpdateProfileInput;
}

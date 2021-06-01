import { Field, InputType } from '@nestjs/graphql';
import { UpdateProfileInput } from '@domain/community/profile';
import { UpdateNameableInput } from '@domain/common/nameable-entity';
@InputType()
export class UpdateOrganisationInput extends UpdateNameableInput {
  @Field(() => UpdateProfileInput, { nullable: true })
  profileData?: UpdateProfileInput;
}

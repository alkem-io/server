import { Field, InputType } from '@nestjs/graphql';
import { CreateProfileInput } from '@domain/community/profile';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity';

@InputType()
export class CreateOrganisationInput extends CreateNameableInput {
  @Field(() => CreateProfileInput, { nullable: true })
  profileData?: CreateProfileInput;
}

import { Field, InputType } from '@nestjs/graphql';
import { CreateProfileInput } from '@domain/community/profile/dto';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity';

@InputType()
export class CreateContributorInput extends CreateNameableInput {
  @Field(() => CreateProfileInput, { nullable: true })
  profileData?: CreateProfileInput;
}

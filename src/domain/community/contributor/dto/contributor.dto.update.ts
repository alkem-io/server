import { Field, InputType } from '@nestjs/graphql';
import { UpdateProfileInput } from '@domain/community/profile/dto/profile.dto.update';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity';

@InputType()
export class UpdateContributorInput extends UpdateNameableInput {
  @Field(() => UpdateProfileInput, { nullable: true })
  profileData?: UpdateProfileInput;
}

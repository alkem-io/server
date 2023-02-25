import { Field, InputType } from '@nestjs/graphql';
import { CreateProfileInput } from '@domain/community/profile/dto';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create';

@InputType()
export class CreateContributorInput extends CreateNameableInput {
  @Field(() => CreateProfileInput, { nullable: true })
  @ValidateNested()
  @Type(() => CreateProfileInput)
  profileData?: CreateProfileInput;
}

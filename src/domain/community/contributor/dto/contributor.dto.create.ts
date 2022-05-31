import { Field, InputType } from '@nestjs/graphql';
import { CreateProfileInput } from '@domain/community/profile/dto';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CreateContributorInput extends CreateNameableInput {
  @Field(() => CreateProfileInput, { nullable: true })
  @ValidateNested()
  @Type(() => CreateProfileInput)
  profileData?: CreateProfileInput;
}

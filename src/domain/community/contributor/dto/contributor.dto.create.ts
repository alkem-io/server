import { Field, InputType } from '@nestjs/graphql';
import { CreateProfileInput } from '@domain/community/profile/dto';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateNameable2Input } from '@domain/common/entity/nameable-entity/nameable.dto.create2';

@InputType()
export class CreateContributorInput extends CreateNameable2Input {
  @Field(() => CreateProfileInput, { nullable: true })
  @ValidateNested()
  @Type(() => CreateProfileInput)
  profileData?: CreateProfileInput;
}

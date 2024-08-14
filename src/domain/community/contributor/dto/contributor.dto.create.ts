import { Field, InputType } from '@nestjs/graphql';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CreateContributorInput {
  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID?: string;

  @Field(() => CreateProfileInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateProfileInput)
  profileData!: CreateProfileInput;
}

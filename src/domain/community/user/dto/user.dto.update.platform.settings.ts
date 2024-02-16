import { MID_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, MaxLength } from 'class-validator';

@InputType()
export class UpdateUserPlatformSettingsInput {
  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the User whose platform managed information is to be updated.',
  })
  userID!: string;

  @Field(() => NameID, {
    nullable: true,
    description: 'Upate the URL path for the User.',
  })
  nameID?: string;

  @Field({
    nullable: true,
  })
  @IsEmail()
  @MaxLength(MID_TEXT_LENGTH)
  email?: string;
}

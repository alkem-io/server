import { UpdateAccountInput } from '@domain/challenge/account/dto/account.dto.update';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

@InputType()
export class UpdateSpacePlatformSettingsInput {
  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Space whose license etc is to be updated.',
  })
  spaceID!: string;

  @Field(() => UpdateAccountInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateAccountInput)
  account?: UpdateAccountInput;

  @Field(() => NameID, {
    nullable: true,
    description: 'Upate the URL path for the Space.',
  })
  nameID?: string;
}

import { NameID } from '@domain/common/scalars/scalar.nameid';
import { UUID_NAMEID } from '@domain/common/scalars/scalar.uuid.nameid';
import { UpdateLicenseInput } from '@domain/license/license/dto/license.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

@InputType()
export class UpdateSpaceSettingsInput {
  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Space whose license etc is to be updated.',
  })
  spaceID!: string;

  @Field(() => NameID, {
    nullable: true,
    description: 'Upate the URL path for the Space.',
  })
  nameID?: string;

  @Field(() => UUID_NAMEID, {
    nullable: true,
    description: 'Update the host Organization for the Space.',
  })
  @IsOptional()
  hostID?: string;

  @Field(() => UpdateLicenseInput, {
    nullable: true,
    description: 'Update the license settings for the Space.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateLicenseInput)
  license?: UpdateLicenseInput;
}

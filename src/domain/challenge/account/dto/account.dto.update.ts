import { UUID } from '@domain/common/scalars/scalar.uuid';
import { UUID_NAMEID } from '@domain/common/scalars/scalar.uuid.nameid';
import { UpdateLicenseInput } from '@domain/license/license/dto/license.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

@InputType()
export class UpdateAccountInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The identifier for the Account to be updated.',
  })
  accountID!: string;

  @Field(() => UUID_NAMEID, {
    nullable: true,
    description: 'Update the host Organization for the Account.',
  })
  @IsOptional()
  hostID?: string;

  @Field(() => UpdateLicenseInput, {
    nullable: true,
    description: 'Update the license settings for the Account.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateLicenseInput)
  license?: UpdateLicenseInput;
}

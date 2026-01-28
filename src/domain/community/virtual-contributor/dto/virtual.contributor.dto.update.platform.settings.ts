import { UUID } from '@domain/common/scalars';
import { UpdateVirtualContributorPlatformSettingsEntityInput } from '@domain/community/virtual-contributor-platform-settings';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

@InputType()
export class UpdateVirtualContributorPlatformSettingsInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'ID of the Virtual Contributor to update.',
  })
  virtualContributorID!: string;

  @Field(() => UpdateVirtualContributorPlatformSettingsEntityInput, {
    nullable: false,
    description:
      'Platform-level settings to apply to this Virtual Contributor.',
  })
  @ValidateNested()
  @Type(() => UpdateVirtualContributorPlatformSettingsEntityInput)
  settings!: UpdateVirtualContributorPlatformSettingsEntityInput;
}

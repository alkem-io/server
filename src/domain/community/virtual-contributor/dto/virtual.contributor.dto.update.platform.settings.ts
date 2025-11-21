import { Field, InputType } from '@nestjs/graphql';
import { UpdateVirtualContributorPlatformSettingsEntityInput } from '@domain/community/virtual-contributor-platform-settings';

@InputType()
export class UpdateVirtualContributorPlatformSettingsInput {
  @Field(() => String, {
    nullable: false,
    description: 'ID of the Virtual Contributor to update.',
  })
  virtualContributorID!: string;

  @Field(() => UpdateVirtualContributorPlatformSettingsEntityInput, {
    nullable: false,
    description:
      'Platform-level settings to apply to this Virtual Contributor.',
  })
  settings!: UpdateVirtualContributorPlatformSettingsEntityInput;
}

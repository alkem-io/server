import { SpaceSortMode } from '@common/enums/space.sort.mode';
import { Field, InputType } from '@nestjs/graphql';
import { UpdateSpaceSettingsCollaborationInput } from './space.settings.collaboration.dto.update';
import { UpdateSpaceSettingsMembershipInput } from './space.settings.membership.dto.update';
import { UpdateSpaceSettingsPrivacyInput } from './space.settings.privacy.dto.update';

@InputType()
export class UpdateSpaceSettingsEntityInput {
  @Field(() => UpdateSpaceSettingsPrivacyInput, {
    nullable: true,
    description: '',
  })
  privacy?: UpdateSpaceSettingsPrivacyInput;

  @Field(() => UpdateSpaceSettingsMembershipInput, {
    nullable: true,
    description: '',
  })
  membership?: UpdateSpaceSettingsMembershipInput;

  @Field(() => UpdateSpaceSettingsCollaborationInput, {
    nullable: true,
    description: '',
  })
  collaboration?: UpdateSpaceSettingsCollaborationInput;

  @Field(() => SpaceSortMode, {
    nullable: true,
    description: 'The sort mode for subspaces: Alphabetical or Custom.',
  })
  sortMode?: SpaceSortMode;
}

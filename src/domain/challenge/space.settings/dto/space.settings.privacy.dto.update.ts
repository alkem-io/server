import { Field, InputType } from '@nestjs/graphql';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';

@InputType()
export class UpdateSpaceSettingsPrivacyInput {
  @Field(() => SpacePrivacyMode, {
    nullable: false,
    description: '',
  })
  mode!: SpacePrivacyMode;
}

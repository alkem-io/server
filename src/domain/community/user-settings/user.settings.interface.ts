import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { Field, ObjectType } from '@nestjs/graphql';
import { IUserSettingsCommunication } from './user.settings.communications.interface';
import { IUserSettingsHomeSpace } from './user.settings.home.space.interface';
import { IUserSettingsNotification } from './user.settings.notification.interface';
import { IUserSettingsPrivacy } from './user.settings.privacy.interface';

@ObjectType('UserSettings')
export class IUserSettings extends IAuthorizable {
  @Field(() => IUserSettingsPrivacy, {
    nullable: false,
    description: 'The privacy settings for this User',
  })
  privacy!: IUserSettingsPrivacy;

  @Field(() => IUserSettingsCommunication, {
    nullable: false,
    description: 'The communication settings for this User.',
  })
  communication!: IUserSettingsCommunication;

  @Field(() => IUserSettingsNotification, {
    nullable: false,
    description: 'The notification settings for this User.',
  })
  notification!: IUserSettingsNotification;

  @Field(() => IUserSettingsHomeSpace, {
    nullable: false,
    description: 'The home space settings for this User.',
  })
  homeSpace!: IUserSettingsHomeSpace;
}

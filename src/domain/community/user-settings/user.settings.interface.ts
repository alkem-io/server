import { Field, ObjectType } from '@nestjs/graphql';
import { IUserSettingsPrivacy } from './user.settings.privacy.interface';
import { IUserSettingsCommunication } from './user.settings.communications.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IUserSettingsNotification } from './user.settings.notification.interface';

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
}

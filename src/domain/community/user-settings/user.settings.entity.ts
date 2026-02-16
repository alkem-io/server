import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { IUserSettingsCommunication } from './user.settings.communications.interface';
import { IUserSettingsHomeSpace } from './user.settings.home.space.interface';
import { IUserSettings } from './user.settings.interface';
import { IUserSettingsNotification } from './user.settings.notification.interface';
import { IUserSettingsPrivacy } from './user.settings.privacy.interface';

export class UserSettings extends AuthorizableEntity implements IUserSettings {
  communication!: IUserSettingsCommunication;

  privacy!: IUserSettingsPrivacy;

  notification!: IUserSettingsNotification;

  homeSpace!: IUserSettingsHomeSpace;
}

import { Column, Entity } from 'typeorm';
import { IUserSettings } from './user.settings.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { IUserSettingsPrivacy } from './user.settings.privacy.interface';
import { IUserSettingsCommunication } from './user.settings.communications.interface';
import { IUserSettingsNotification } from './user.settings.notification.interface';

@Entity()
export class UserSettings extends AuthorizableEntity implements IUserSettings {
  @Column('jsonb', { nullable: false })
  communication!: IUserSettingsCommunication;

  @Column('jsonb', { nullable: false })
  privacy!: IUserSettingsPrivacy;

  @Column('jsonb', { nullable: false })
  notification!: IUserSettingsNotification;
}

import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Column, Entity } from 'typeorm';
import { IUserSettingsCommunication } from './user.settings.communications.interface';
import { IUserSettings } from './user.settings.interface';
import { IUserSettingsNotification } from './user.settings.notification.interface';
import { IUserSettingsPrivacy } from './user.settings.privacy.interface';

@Entity()
export class UserSettings extends AuthorizableEntity implements IUserSettings {
  @Column('jsonb', { nullable: false })
  communication!: IUserSettingsCommunication;

  @Column('jsonb', { nullable: false })
  privacy!: IUserSettingsPrivacy;

  @Column('jsonb', { nullable: false })
  notification!: IUserSettingsNotification;
}

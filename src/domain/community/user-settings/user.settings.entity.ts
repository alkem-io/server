import { Column, Entity } from 'typeorm';
import { IUserSettings } from './user.settings.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { IUserSettingsPrivacy } from './user.settings.privacy.interface';
import { IUserSettingsCommunication } from './user.settings.communications.interface';

@Entity()
export class UserSettings extends AuthorizableEntity implements IUserSettings {
  @Column('json', { nullable: false })
  communication!: IUserSettingsCommunication;

  @Column('json', { nullable: false })
  privacy!: IUserSettingsPrivacy;
}

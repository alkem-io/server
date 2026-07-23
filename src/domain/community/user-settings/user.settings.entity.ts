import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Column, Entity } from 'typeorm';
import { IUserSettingsAssistant } from './user.settings.assistant.interface';
import { IUserSettingsCommunication } from './user.settings.communications.interface';
import { DESIGN_VERSION_CURRENT_DEFAULT } from './user.settings.design.version.constants';
import { IUserSettingsHomeSpace } from './user.settings.home.space.interface';
import { IUserSettings } from './user.settings.interface';
import { IUserSettingsNotification } from './user.settings.notification.interface';
import { IUserSettingsPrivacy } from './user.settings.privacy.interface';

@Entity()
export class UserSettings extends AuthorizableEntity implements IUserSettings {
  @Column('jsonb', { nullable: false })
  communication!: IUserSettingsCommunication;

  @Column('jsonb', { nullable: false })
  privacy!: IUserSettingsPrivacy;

  @Column('jsonb', {
    nullable: false,
    default: { enabledCapabilities: [] },
  })
  assistant!: IUserSettingsAssistant;

  @Column('jsonb', { nullable: false })
  notification!: IUserSettingsNotification;

  @Column('jsonb', {
    nullable: false,
    default: { spaceID: null, autoRedirect: false },
  })
  homeSpace!: IUserSettingsHomeSpace;

  @Column('int', { nullable: false, default: DESIGN_VERSION_CURRENT_DEFAULT })
  designVersion!: number;

  @Column('varchar', { length: 16, nullable: true })
  language!: string | null;

  @Column('boolean', { nullable: false, default: false })
  languageOfferAnswered!: boolean;
}

import { TINY_TEXT_LENGTH } from '@common/constants';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { AfterLoad, Column, Entity } from 'typeorm';
import { IUserSettingsAssistant } from './user.settings.assistant.interface';
import { IUserSettingsCommunication } from './user.settings.communications.interface';
import { DESIGN_VERSION_CURRENT_DEFAULT } from './user.settings.design.version.constants';
import { IUserSettingsHomeSpace } from './user.settings.home.space.interface';
import { IUserSettings } from './user.settings.interface';
import { IUserSettingsNotification } from './user.settings.notification.interface';
import { IUserSettingsPrivacy } from './user.settings.privacy.interface';

// 034-messaging-notifications (FR-004, corr-server-3): the mandated default
// for the two messaging-notification rows. Same literal values as the
// migration (1785336300000) and getDefaultUserSettings() — kept as a
// standalone constant here because this hook must be defensive independently
// of both (rolling-deploy race: an old pod can persist a `user_settings` row
// without these keys AFTER the migration has already run once).
const DEFAULT_CONVERSATION_MESSAGE_CHANNELS = Object.freeze({
  email: false,
  inApp: false,
  push: true,
});

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

  @Column('varchar', { length: TINY_TEXT_LENGTH, nullable: true })
  language!: string | null;

  @Column('boolean', { nullable: false, default: false })
  languageOfferAnswered!: boolean;

  /**
   * 034-messaging-notifications (corr-server-3): defend on read against a
   * `user_settings` row whose `notification.user` object predates the two
   * messaging-notification keys — the additive backfill migration
   * (1785336300000) heals every row it can reach, but a row inserted by an
   * old pod during a rolling deploy AFTER the migration has already run is
   * never revisited. Without this, the non-null GraphQL fields
   * (`UserSettingsNotificationUser.conversationMessageDirect/Group`) would
   * null out the parent chain, and `getChannelsSettingsForEvent` would throw
   * for the whole recipients batch. Runs for every entity load regardless of
   * query path (recipients lookup, settings resolver, admin tooling).
   */
  @AfterLoad()
  applyConversationMessageNotificationDefaults() {
    if (!this.notification?.user) {
      return;
    }
    if (!this.notification.user.conversationMessageDirect) {
      this.notification.user.conversationMessageDirect = {
        ...DEFAULT_CONVERSATION_MESSAGE_CHANNELS,
      };
    }
    if (!this.notification.user.conversationMessageGroup) {
      this.notification.user.conversationMessageGroup = {
        ...DEFAULT_CONVERSATION_MESSAGE_CHANNELS,
      };
    }
  }
}

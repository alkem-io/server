import { Field, ObjectType } from '@nestjs/graphql';
import { IUserSettingsPrivacy } from './user.settings.privacy.interface';
import { IUserSettingsCommunication } from './user.settings.communications.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';

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
}

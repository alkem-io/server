import { Field, ObjectType } from '@nestjs/graphql';
import { IOrganizationSettingsMembership } from './organization.settings.membership.interface';
import { IOrganizationSettingsPrivacy } from './organization.settings.privacy.interface';
import { IOrganizationSettingsSecurity } from './organization.settings.security.interface';

@ObjectType('OrganizationSettings')
export abstract class IOrganizationSettings {
  @Field(() => IOrganizationSettingsPrivacy, {
    nullable: false,
    description: 'The privacy settings for this Organization',
  })
  privacy!: IOrganizationSettingsPrivacy;

  @Field(() => IOrganizationSettingsMembership, {
    nullable: false,
    description: 'The membership settings for this Organization.',
  })
  membership!: IOrganizationSettingsMembership;

  @Field(() => IOrganizationSettingsSecurity, {
    nullable: false,
    description: 'The security settings for this Organization.',
  })
  security!: IOrganizationSettingsSecurity;
}

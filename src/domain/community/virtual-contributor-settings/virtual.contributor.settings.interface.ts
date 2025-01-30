import { Field, ObjectType } from '@nestjs/graphql';
import { IVirtualContributorSettingsPrivacy } from './virtual.contributor.settings.privacy.interface';

@ObjectType('VirtualContributorSettings')
export abstract class IVirtualContributorSettings {
  @Field(() => IVirtualContributorSettingsPrivacy, {
    nullable: false,
    description: 'The privacy settings for this VirtualContributor',
  })
  privacy!: IVirtualContributorSettingsPrivacy;
}

import { UserPreferenceType } from '@common/enums';
import { HubPreferenceType } from '@common/enums/hub.preference.type';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IPreferenceDefinition } from './preference.definition.interface';

@Resolver(() => IPreferenceDefinition)
export class PreferenceDefinitionResolverFields {
  @ResolveField('userType', () => UserPreferenceType, {
    nullable: true,
    description: 'The type for a UserPreference.',
  })
  userType(@Parent() preferenceDefinition: IPreferenceDefinition) {
    return preferenceDefinition.type;
  }

  @ResolveField('hubType', () => HubPreferenceType, {
    nullable: true,
    description: 'The type for a Preference on a Hub',
  })
  hubType(@Parent() preferenceDefinition: IPreferenceDefinition) {
    return preferenceDefinition.type;
  }
}

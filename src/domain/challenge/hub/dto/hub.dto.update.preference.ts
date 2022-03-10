import { Field, InputType } from '@nestjs/graphql';
import { UUID_NAMEID } from '@domain/common/scalars';
import { HubPreferenceType } from '@common/enums/hub.preference.type';

@InputType()
export class UpdateHubPreferenceInput {
  @Field(() => UUID_NAMEID, {
    description: 'ID of the Hub',
  })
  hubID!: string;

  @Field(() => HubPreferenceType, {
    description: 'Type of the user preference',
  })
  type!: HubPreferenceType;

  @Field(() => String)
  value!: string;
}

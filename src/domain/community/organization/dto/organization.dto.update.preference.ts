import { Field, InputType } from '@nestjs/graphql';
import { UUID_NAMEID } from '@domain/common/scalars';
import { OrganizationPreferenceType } from '@common/enums/organization.preference.type';

@InputType()
export class UpdateOrganizationPreferenceInput {
  @Field(() => UUID_NAMEID, {
    description: 'ID of the Organization',
  })
  organizationID!: string;

  @Field(() => OrganizationPreferenceType, {
    description: 'Type of the organization preference',
  })
  type!: OrganizationPreferenceType;

  @Field(() => String)
  value!: string;
}

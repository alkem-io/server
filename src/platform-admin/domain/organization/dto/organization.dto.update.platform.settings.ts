import { NameID, UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateOrganizationPlatformSettingsInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the Organization to update.',
  })
  organizationID!: string;

  @Field(() => NameID, {
    nullable: false,
    description: 'Upate the URL path for the Organization.',
  })
  nameID!: string;
}

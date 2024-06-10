import { Field, InputType } from '@nestjs/graphql';
import { NameID, UUID } from '@domain/common/scalars';

@InputType()
export class UpdateOrganizationPlatformSettingsInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the Organization to update.',
  })
  organizationID!: string;

  @Field(() => NameID, {
    nullable: false,
    description: 'Upate the URL path for the User.',
  })
  nameID!: string;
}

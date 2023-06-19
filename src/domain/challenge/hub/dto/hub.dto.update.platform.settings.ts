import { HubVisibility } from '@common/enums/hub.visibility';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { UUID_NAMEID } from '@domain/common/scalars/scalar.uuid.nameid';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class UpdateHubPlatformSettingsInput {
  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Hub whose visibility is to be updated.',
  })
  hubID!: string;

  @Field(() => HubVisibility, {
    nullable: true,
    description: 'Visibility of the Hub.',
  })
  visibility?: HubVisibility;

  @Field(() => NameID, {
    nullable: true,
    description: 'Upate the URL path for the Space.',
  })
  nameID?: string;

  @Field(() => UUID_NAMEID, {
    nullable: true,
    description: 'Update the host Organization for the Hub.',
  })
  @IsOptional()
  hostID?: string;
}

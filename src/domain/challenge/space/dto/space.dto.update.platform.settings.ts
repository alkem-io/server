import { SpaceVisibility } from '@common/enums/space.visibility';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { UUID_NAMEID } from '@domain/common/scalars/scalar.uuid.nameid';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class UpdateSpacePlatformSettingsInput {
  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Space whose visibility is to be updated.',
  })
  spaceID!: string;

  @Field(() => SpaceVisibility, {
    nullable: true,
    description: 'Visibility of the Space.',
  })
  visibility?: SpaceVisibility;

  @Field(() => NameID, {
    nullable: true,
    description: 'Upate the URL path for the Space.',
  })
  nameID?: string;

  @Field(() => UUID_NAMEID, {
    nullable: true,
    description: 'Update the host Organization for the Space.',
  })
  @IsOptional()
  hostID?: string;
}

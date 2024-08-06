import { SpaceVisibility } from '@common/enums/space.visibility';
import { UUID } from '@domain/common/scalars';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class UpdateSpacePlatformSettingsInput {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The identifier for the Space whose license etc is to be updated.',
  })
  spaceID!: string;

  @Field(() => NameID, {
    nullable: true,
    description: 'Upate the URL path for the Space.',
  })
  @IsOptional()
  nameID?: string;

  @Field(() => SpaceVisibility, {
    nullable: true,
    description: 'Visibility of the Space, only on L0 spaces.',
  })
  @IsOptional()
  visibility?: SpaceVisibility;
}

import { NameID } from '@domain/common/scalars/scalar.nameid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateSpacePlatformSettingsInput {
  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Space whose license etc is to be updated.',
  })
  spaceID!: string;

  @Field(() => NameID, {
    nullable: false,
    description: 'Upate the URL path for the Space.',
  })
  nameID!: string;
}

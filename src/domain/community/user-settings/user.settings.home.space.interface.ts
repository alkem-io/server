import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('UserSettingsHomeSpace')
export abstract class IUserSettingsHomeSpace {
  @Field(() => String, {
    nullable: true,
    description: 'The ID of the Space to use as home. Null if not set.',
  })
  spaceID?: string | null;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Automatically redirect to home space instead of the dashboard.',
  })
  autoRedirect!: boolean;
}

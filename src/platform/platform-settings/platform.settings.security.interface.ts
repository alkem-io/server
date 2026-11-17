import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('PlatformSettingsSecurity')
export abstract class IPlatformSettingsSecurity {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Holders of a Platform … role must use a second factor.',
  })
  secondFactorRequiredForPlatformRoles!: boolean;

  @Field(() => Date, {
    nullable: true,
    description:
      'When the rule was last switched on; null while it has never been on.',
  })
  secondFactorRequiredForPlatformRolesSince!: Date | null;
}

/**
 * The block as stored in `platform.settings`. No row written before the rule
 * existed holds it, so every key is optional: read it through
 * `platformSecuritySettings`, never directly.
 */
export type PlatformSettingsSecurityStored = {
  secondFactorRequiredForPlatformRoles?: boolean;
  /** ISO timestamp of the latest off→on transition. */
  secondFactorRequiredForPlatformRolesSince?: string | null;
};

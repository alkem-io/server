import { UUID } from '@domain/common/scalars';
import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { IsBoolean, IsUUID } from 'class-validator';

@InputType()
export class AdminResetUserSecondFactorInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The user whose second factor is reset.',
  })
  @IsUUID()
  userID!: string;

  @Field(() => Boolean, {
    nullable: false,
    description:
      "True whenever anyone else may hold the member's password: the password is then replaced with a secret nobody holds, and the account is regained only through the emailed recovery link. No default.",
  })
  @IsBoolean()
  invalidatePassword!: boolean;
}

@ObjectType()
export class AdminResetUserSecondFactorResult {
  @Field(() => [String], {
    nullable: false,
    description:
      'The second-factor credential types that were removed (totp, webauthn, lookup_secret).',
  })
  removedCredentialTypes!: string[];

  @Field(() => Int, {
    nullable: false,
    description: 'How many application sessions of the user were ended.',
  })
  sessionsRevoked!: number;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'False when it was not asked, or the identity holds no password.',
  })
  passwordInvalidated!: boolean;
}

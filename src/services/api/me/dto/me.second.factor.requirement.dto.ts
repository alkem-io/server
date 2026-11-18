import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('MeSecondFactorRequirement')
export class MeSecondFactorRequirement {
  @Field(() => Boolean, {
    nullable: false,
    description:
      "False for any caller whose credential is not a person's sign-in (API key, delegation token, non-interactive token, service account), whatever its roles. A cookie session and a Hydra bearer read their real coverage.",
  })
  covered!: boolean;

  @Field(() => Date, {
    nullable: true,
    description:
      'When a covering rule starts refusing a sign-in that does not meet it; the earliest of the rules that cover the user.',
  })
  deadline!: Date | null;

  @Field(() => Boolean, {
    nullable: false,
    description:
      "Whether this session's sign-in meets a second-factor rule: it completed a second factor, and the account held at least two ways to pass the second step when they were counted at sign-in.",
  })
  satisfied!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'True when a covering rule applies and this session signed in with a second factor, but the account held fewer than two ways to pass the second step at sign-in. An authenticator app, each security key and recovery codes count one each; a passkey does not count. Signing in again after adding a way updates it.',
  })
  secondWayNeeded!: boolean;
}
